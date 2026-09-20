import { randomBytes } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { Id } from '@catalog/contracts';
import { localSupabase } from './lib/local-supabase.js';

async function main() {
  const [command='app',userId,...reasonParts]=process.argv.slice(2);
  if (!['app','grant','revoke'].includes(command)) throw new Error('Use app, grant USER_UUID REASON, or revoke USER_UUID REASON.');
  const local=await localSupabase();
  const db=postgres(local.adminUrl,{max:1,prepare:false,onnotice:()=>{}});
  try {
    if(command!=='app') {
      const id=Id.parse(userId),reason=reasonParts.join(' ').trim();
      if(!reason) throw new Error('Provide a reason for this membership change.');
      if(!(await db`select id from auth.users where id=${id}`).length) throw new Error('The Auth user does not exist in this local project.');
      await db`insert into editorial.maintainers(user_id,active,reason) values (${id},${command==='grant'},${reason}) on conflict(user_id) do update set active=excluded.active,reason=excluded.reason,changed_at=now()`;
      console.log(`Local maintainer membership ${command==='grant'?'granted':'revoked'} for ${id}.`);
      return;
    }
    const path='apps/catalog/.env.local';
    try { await access(path); console.log('Existing app configuration preserved.'); return; } catch { /* Create a new local configuration. */ }
    const role='catalog_app_local';
    if((await db`select rolname from pg_roles where rolname=${role}`).length) throw new Error('The local application role already exists but its environment file is missing. Recover its credentials instead of silently rotating them.');
    const password=randomBytes(32).toString('hex');
    await db.unsafe(`create role ${role} login password '${password}' inherit`);
    try {
      await db.unsafe(`grant catalog_editor to ${role}`);
      const url=new URL(local.databaseUrl);url.username=role;url.password=password;
      const env=[`NEXT_PUBLIC_SUPABASE_URL=${local.apiUrl}`,`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${local.publishableKey}`,`CATALOG_DATABASE_URL=${url}`, 'CATALOG_APP_ORIGIN=http://127.0.0.1:3100',''];
      await writeFile(path,env.join('\n'),{mode:0o600,flag:'wx'});
    } catch(error) { await db.unsafe(`drop role ${role}`); throw error; }
    console.log('Created a restricted local application login and apps/catalog/.env.local. No accounts or membership grants were created.');
  } finally { await db.end(); }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Local setup failed');process.exitCode=1;});
