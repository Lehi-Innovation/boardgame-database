import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Id, z } from '@catalog/contracts';
import { CommandError, type Actor } from '@catalog/domain';
import { connectDatabase, EditorialService } from '@catalog/database';

export function createEditorialHandler(config: { databaseUrl: string; supabaseUrl: string; publishableKey: string; origin: string }) {
  const connection = connectDatabase(config.databaseUrl);
  const service = new EditorialService(connection.db);
  const auth = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000), redirect: 'error', cache: 'no-store' }) },
  });
  async function authenticate(request: Request): Promise<Actor> {
    const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if (!token || token.length > 16_000) throw new CommandError(401, 'unauthenticated', 'Sign in to continue.');
    // getUser validates this exact token against Auth. Never trust getSession or user metadata.
    const { data, error } = await auth.auth.getUser(token);
    if (error) throw new CommandError(error.status && error.status < 500 ? 401 : 503, 'authentication_failed', 'Unable to verify your sign-in.');
    if (!data.user || data.user.is_anonymous) throw new CommandError(401, 'unauthenticated', 'Sign in with an account to continue.');
    let claims: { sub?: unknown; session_id?: unknown; exp?: unknown };
    try { claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()); }
    catch { throw new CommandError(401, 'invalid_token', 'Sign in again to continue.'); }
    if (claims.sub !== data.user.id || !Id.safeParse(claims.session_id).success || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) throw new CommandError(401, 'invalid_token', 'Sign in again to continue.');
    return { userId: data.user.id, sessionId: claims.session_id as string, expiresAt: claims.exp };
  }
  async function readBody(request: Request) {
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new CommandError(415, 'content_type', 'Send JSON content.');
    if (Number(request.headers.get('content-length')) > 256_000) throw new CommandError(413, 'body_too_large', 'The submission is too large.');
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 256_000) { await reader.cancel(); throw new CommandError(413, 'body_too_large', 'The submission is too large.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString()); }
    catch { throw new CommandError(400, 'invalid_json', 'Send a valid JSON object.'); }
  }
  async function handle(request: Request) {
    const requestId = randomUUID();
    const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization, Origin', 'X-Request-Id': requestId, 'X-Content-Type-Options': 'nosniff' };
    try {
      // Bearer-only API: cookies never authenticate a command. Also reject cross-origin browser calls.
      const origin = request.headers.get('origin');
      if ((origin && origin !== config.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new CommandError(403, 'origin', 'Use this application to submit changes.');
      const actor = await authenticate(request);
      await service.session(actor);
      const url = new URL(request.url);
      if (url.search) throw new CommandError(400, 'query_parameters', 'This endpoint does not accept query parameters.');
      const path = url.pathname.replace(/^\/api\/editorial\/v1\/?/, '');
      let result: unknown;
      if (request.method === 'GET') {
        if (path === 'session') result = await service.session(actor);
        else if (path === 'proposals') result = await service.list(actor);
        else if (path === 'reports') result = await service.reports(actor);
        else if (path === 'contributions') result = await service.contributions(actor);
        else if (path === 'records') result = await service.records(actor);
        else if (path.startsWith('proposals/') && Id.safeParse(path.slice(10)).success) result = await service.detail(actor, path.slice(10));
        else throw new CommandError(404, 'not_found', 'Endpoint not found.');
      } else if (request.method === 'POST') {
        if (!await service.consume(actor)) throw new CommandError(429, 'rate_limit', 'Too many changes. Wait a minute and try again.');
        const body = await readBody(request);
        switch (path) {
          case 'proposals/save': result = await service.save(actor, body); break;
          case 'proposals/submit': result = await service.submit(actor, body); break;
          case 'proposals/withdraw': result = await service.withdraw(actor, body); break;
          case 'proposals/validate': result = await service.validate(actor, body); break;
          case 'proposals/review': result = await service.review(actor, body); break;
          case 'comments': result = await service.comment(actor, body); break;
          case 'reports': result = await service.report(actor, body); break;
          case 'contributions': result = await service.contribute(actor, body); break;
          case 'contributions/triage': result = await service.triageContribution(actor, body); break;
          default: throw new CommandError(404, 'not_found', 'Endpoint not found.');
        }
      } else throw new CommandError(405, 'method', 'Use GET or POST.');
      return Response.json({ data: result }, { headers });
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      const databaseConflict = cause && typeof cause === 'object' && 'code' in cause && ['23505','40001','40P01'].includes(String(cause.code));
      const failure = error instanceof CommandError ? error : error instanceof z.ZodError
        ? new CommandError(400, 'invalid_command', 'Check the submitted fields.', error.issues.map(issue => ({ path: issue.path, message: issue.message })))
        : databaseConflict ? new CommandError(409, 'conflict', 'The catalog changed while applying this command. Reload and review the current version.')
        : new CommandError(503, 'unavailable', 'The service is temporarily unavailable.');
      // Do not log database URLs, token-bearing errors, bodies, or private discussion.
      if (failure.status === 503) console.error(`Editorial request ${requestId} unavailable`);
      return Response.json({ error: { code: failure.code, message: failure.message, fields: failure.fields, request_id: requestId } }, {
        status: failure.status, headers: { ...headers, ...(failure.status === 429 ? { 'Retry-After': '60' } : {}) },
      });
    }
  }
  return { handle, close: connection.close };
}
