import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

export async function localSupabase() {
  let status: Record<string, string>;
  try { status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status','-o','json'], { encoding:'utf8', stdio:['ignore','pipe','pipe'], timeout:30_000, env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1'} })); }
  catch { throw new Error('Cannot read local Supabase status. Start this project’s stack first.'); }
  const config = await readFile('supabase/config.toml','utf8');
  for (const [key,section,protocol] of [['API_URL','api','http:'],['DB_URL','db','postgresql:']]) {
    const url = new URL(status[key!]!);
    const port = config.split(`[${section}]`)[1]?.split('\n[')[0]?.match(/^port\s*=\s*(\d+)/m)?.[1];
    if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.port !== port || url.protocol !== protocol) throw new Error('Only this project’s local Supabase stack is allowed.');
  }
  if (!status.PUBLISHABLE_KEY || !status.SECRET_KEY) throw new Error('Local Supabase keys are missing.');
  const adminUrl = new URL(status.DB_URL!);
  adminUrl.username='supabase_admin';
  return { apiUrl:status.API_URL!,databaseUrl:status.DB_URL!,adminUrl:adminUrl.toString(),publishableKey:status.PUBLISHABLE_KEY,secretKey:status.SECRET_KEY };
}
