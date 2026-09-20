import { createEditorialHandler } from '@catalog/server';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
let handler: ReturnType<typeof createEditorialHandler> | undefined;
function route(request: Request) {
  const databaseUrl = process.env.CATALOG_DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const origin = process.env.CATALOG_APP_ORIGIN;
  if (!databaseUrl || !supabaseUrl || !publishableKey || !origin) return Response.json({ error: { code: 'not_configured', message: 'The contribution service is not configured.', request_id: randomUUID() } }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  handler ??= createEditorialHandler({ databaseUrl, supabaseUrl, publishableKey, origin });
  return handler.handle(request);
}
export { route as GET, route as POST, route as PUT, route as PATCH, route as DELETE };
