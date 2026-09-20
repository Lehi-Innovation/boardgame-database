import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

// Never migrates an existing database. A supplied local admin URL creates a disposable DB;
// otherwise start an entirely separate native PostgreSQL cluster in the temporary directory.
const adminUrl = process.env.CATALOG_TEST_ADMIN_URL;
let scratch: string | undefined;
let pgBin: string | undefined;
let started = false;
let admin: postgres.Sql | undefined;
let client: postgres.Sql | undefined;
let databaseName: string | undefined;
let databaseUrl: string | undefined;

async function run(command: string, args: string[], env = process.env) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

try {
  if (adminUrl) {
    const url = new URL(adminUrl);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Database checks only allow a local admin URL');
    databaseName = `catalog_test_${randomUUID().replaceAll('-', '')}`;
    admin = postgres(adminUrl, { max: 1, prepare: false });
    await admin.unsafe(`create database "${databaseName}"`);
    url.pathname = `/${databaseName}`;
    databaseUrl = url.toString();
  } else {
    try { pgBin = process.env.PG_BIN ?? execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim(); }
    catch (cause) { throw new Error('Cannot execute pg_config. Install PostgreSQL server tools, allow child processes, or set CATALOG_TEST_ADMIN_URL to a local admin connection', { cause }); }
    scratch = await mkdtemp(join(tmpdir(), 'catalog-pg-'));
    execFileSync(join(pgBin, 'initdb'), ['-D', join(scratch, 'data'), '-U', 'postgres', '--auth=trust', '--no-locale', '--encoding=UTF8'], { stdio: 'pipe' });
    const port = await new Promise<number>((resolve, reject) => {
      const server = createServer();
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') { server.close(); reject(new Error('No local port')); return; }
        server.close(error => error ? reject(error) : resolve(address.port));
      });
    });
    execFileSync(join(pgBin, 'pg_ctl'), ['-D', join(scratch, 'data'), '-l', join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -k ${scratch} -p ${port}`, '-w', 'start'], { stdio: 'pipe' });
    started = true;
    databaseUrl = `postgresql://postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
  }
  client = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
  // Native Postgres lacks Supabase's browser roles; reproduce their unprivileged role boundary.
  await client.unsafe(`do $$ begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  end $$;`);
  const version = await client`show server_version`;
  // Disposable plain PostgreSQL databases model only the session fields used by the private view.
  // Real Auth behavior is covered separately against the running Supabase stack.
  await client.unsafe(`create schema auth; create table auth.sessions(id uuid primary key, user_id uuid not null, not_after timestamptz);`);
  console.log(`Testing fresh PostgreSQL ${version[0]!.server_version} database`);
  const migrations = (await readdir('supabase/migrations')).filter(file => file.endsWith('.sql')).sort();
  if (!migrations.length) throw new Error('No migration files');
  for (const file of migrations) {
    const sql = await readFile(join('supabase/migrations', file), 'utf8');
    await client.begin(tx => tx.unsafe(sql));
    console.log(`Applied ${file}`);
  }
  // Supabase's postgres login is not a superuser. On PostgreSQL 16+, creating
  // a role grants ADMIN without necessarily granting SET, so CREATEROLE alone
  // is not enough to exercise the capability-role tests. Never broaden the
  // running cluster's grants just to make the harness pass.
  for (const role of ['anon', 'authenticated', 'catalog_reader', 'catalog_editor', 'catalog_publisher']) {
    try {
      await client.begin(tx => tx.unsafe(`set local role ${role}`));
    } catch {
      throw new Error(`Test administrator cannot SET ROLE ${role}. Use a local test administrator with SET access to all test roles (supabase_admin on the local Supabase stack). No role memberships were changed.`);
    }
  }
  if (process.argv.includes('--advisors')) {
    await run('node_modules/.bin/supabase', ['db', 'advisors', '--db-url', databaseUrl, '--level', 'warn', '--fail-on', 'error']);
  }
  await run(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', 'tests/database.test.ts', 'tests/editorial.test.ts'], { ...process.env, CATALOG_TEST_DATABASE_URL: databaseUrl });
} finally {
  await client?.end();
  if (admin && databaseName) {
    await admin.unsafe(`drop database "${databaseName}" with (force)`);
    await admin.end();
  }
  if (started && scratch && pgBin) execFileSync(join(pgBin, 'pg_ctl'), ['-D', join(scratch, 'data'), '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  if (scratch) await rm(scratch, { recursive: true, force: true });
}
