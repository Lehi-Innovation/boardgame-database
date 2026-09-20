import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

// Exercises this project's running local stack. Creates only one temporary Auth
// user, deletes it in finally, and never resets a database or writes catalog data.
async function main() {
  let status: Record<string, string>;
  try {
    status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status', '-o', 'json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    })) as Record<string, string>;
  } catch {
    // CLI status contains credentials: never print its output on failure.
    throw new Error('Cannot read local Supabase status. Run npm run db:start first.');
  }
  const config = await readFile('supabase/config.toml', 'utf8');
  const port = (section: string) => {
    const block = config.split(`[${section}]`)[1]?.split('\n[')[0];
    const value = block?.match(/^port\s*=\s*(\d+)/m)?.[1];
    assert.ok(value, `Missing ${section} port in supabase/config.toml`);
    return value;
  };
  const localUrl = (key: string, section: string, protocol: string) => {
    const value = status[key];
    assert.ok(value, `CLI status is missing ${key}`);
    const url = new URL(value);
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only loopback Supabase services are allowed');
    assert.equal(url.protocol, protocol, `Unexpected ${key} protocol`);
    assert.equal(url.port, port(section), `${key} must match this project's configured port`);
    return value;
  };
  const apiUrl = localUrl('API_URL', 'api', 'http:');
  const databaseUrl = localUrl('DB_URL', 'db', 'postgresql:');
  const publicKey = status.PUBLISHABLE_KEY;
  const secretKey = status.SECRET_KEY;
  assert.ok(publicKey, 'CLI must provide a publishable key');
  assert.ok(secretKey, 'CLI must provide a secret key for temporary Auth-user cleanup');

  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(15_000), redirect: 'error' }) } };
  const admin = createClient(apiUrl, secretKey, options);
  const browser = createClient(apiUrl, publicKey, options);
  const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 10 });
  let userId: string | undefined;
  let signedIn = false;
  try {
    const [version] = await db`select current_setting('server_version') as version,
      current_setting('server_version_num')::int as number`;
    assert.ok(version && version.number >= 170000 && version.number < 180000, 'Local Supabase must use PostgreSQL 17');
    const expected = (await readdir('supabase/migrations')).filter(file => file.endsWith('.sql')).map(file => file.split('_')[0]).sort();
    const applied = await db`select version from supabase_migrations.schema_migrations order by version`;
    assert.deepEqual(applied.map(row => row.version), expected, 'Local migrations differ; run npm run db:migrate');
    console.log(`PASS PostgreSQL ${version.version} and local migration history`);

    const privileges = await db`select role_name, schema_name,
      has_schema_privilege(role_name, schema_name, 'USAGE') as allowed
      from unnest(array['anon','authenticated']) role_name,
      unnest(array['editorial','catalog','operations']) schema_name`;
    assert.ok(privileges.every(row => row.allowed === false), 'Browser roles must not access internal schemas');
    console.log('PASS browser database roles have no internal schema access');

    const health = await fetch(`${apiUrl}/auth/v1/health`, {
      headers: { apikey: publicKey }, signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
    assert.equal(health.status, 200, 'Auth health check failed');

    const email = `catalog-smoke-${randomUUID()}@example.invalid`;
    const password = `${randomUUID()}Aa1!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    userId = created.data.user?.id;
    assert.ok(!created.error && userId, `Temporary Auth user creation failed: ${created.error?.code ?? 'missing user'}`);
    const login = await browser.auth.signInWithPassword({ email, password });
    signedIn = !!login.data.session;
    assert.ok(!login.error && login.data.session, 'Password sign-in failed');
    assert.equal(login.data.user?.id, userId);
    const verified = await browser.auth.getUser();
    assert.ok(!verified.error, 'Server user verification failed');
    assert.equal(verified.data.user?.id, userId);
    const invalid = await admin.auth.getUser('invalid-access-token');
    assert.ok(invalid.error && !invalid.data.user, 'Invalid access token must be rejected');
    console.log('PASS Auth sign-in, server user verification, and invalid-token rejection');

    // Check real HTTP requests, both before and after login. POST bodies cannot
    // create a valid record even if schema exposure accidentally regresses.
    for (const token of [null, login.data.session.access_token]) {
      for (const [schema, table] of [['editorial', 'proposals'], ['catalog', 'documents'], ['operations', 'jobs']]) {
        for (const method of ['GET', 'POST']) {
          const headers: Record<string, string> = { apikey: publicKey, 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token}`;
          headers[method === 'GET' ? 'Accept-Profile' : 'Content-Profile'] = schema!;
          const response = await fetch(`${apiUrl}/rest/v1/${table}`, {
            method, headers, ...(method === 'POST' ? { body: '{}' } : {}),
            signal: AbortSignal.timeout(15_000), redirect: 'error',
          });
          const body = await response.json() as { code?: string };
          assert.equal(response.status, 406, `${method} ${schema} must reject ${token ? 'authenticated' : 'anonymous'} access`);
          assert.equal(body.code, 'PGRST106', 'Expected rejection of an unexposed schema');
        }
      }
    }
    console.log('PASS anonymous and signed-in Data API reads/writes reject all internal schemas');

    const refreshed = await browser.auth.refreshSession();
    assert.ok(!refreshed.error && refreshed.data.session, 'Session refresh failed');
    assert.equal(refreshed.data.user?.id, userId);
    const refreshToken = refreshed.data.session.refresh_token;
    const logout = await browser.auth.signOut({ scope: 'local' });
    assert.ok(!logout.error, 'Sign-out failed');
    signedIn = false;
    const sessions = await db`select id from auth.sessions where user_id = ${userId}`;
    assert.equal(sessions.length, 0, 'Sign-out must remove the temporary server session');
    const revoked = await browser.auth.refreshSession({ refresh_token: refreshToken });
    assert.ok(revoked.error && !revoked.data.session, 'Signed-out refresh token must be rejected');
    // Access JWTs can remain valid until expiry; M2 sensitive commands must also
    // check current server session/membership, not only JWT signature validity.
    console.log('PASS refresh, sign-out, server session removal, and refresh-token revocation');
  } finally {
    try {
      if (signedIn) await browser.auth.signOut({ scope: 'local' });
    } finally {
      try {
        if (userId) {
          const deleted = await admin.auth.admin.deleteUser(userId);
          assert.ok(!deleted.error, `Temporary Auth-user cleanup failed (${userId})`);
          const remaining = await db`select id from auth.users where id = ${userId}`;
          assert.equal(remaining.length, 0, 'Temporary Auth user remains after cleanup');
          console.log('PASS temporary Auth user removed');
        }
      } finally {
        await db.end();
      }
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Local Supabase verification failed');
  process.exitCode = 1;
});
