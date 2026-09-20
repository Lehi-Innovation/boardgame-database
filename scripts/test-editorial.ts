import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { localSupabase } from './lib/local-supabase.js';
import { game, sourceFixture } from '../tests/fixtures/catalog.js';

// Real HTTP through Next.js and real Supabase Auth. Only generated accounts/IDs are written.
// Cleanup uses a local admin connection, disables immutable triggers in its transaction only,
// and deletes precisely these synthetic rows. No TRUNCATE, reset, or legacy data writes.
async function main() {
  const local=await localSupabase();
  const admin=createClient(local.apiUrl,local.secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const db=postgres(local.adminUrl,{max:1,prepare:false,onnotice:()=>{}});
  const role=`catalog_http_${randomBytes(8).toString('hex')}`, password=randomBytes(32).toString('hex');
  let createdRole=false, child:ChildProcess|undefined, visualBrowser:Browser|undefined;
  const users:string[]=[], proposals:string[]=[], sources:string[]=[], entities:string[]=[];
  const browsers: SupabaseClient[]=[];
  const proposalId=randomUUID(), sourceId=randomUUID(), entityId=randomUUID();
  proposals.push(proposalId); sources.push(sourceId); entities.push(entityId);
  try {
    await db.unsafe(`create role ${role} login password '${password}' inherit`); createdRole=true;
    await db.unsafe(`grant catalog_editor to ${role}`);
    const appUrl=new URL(local.databaseUrl); appUrl.username=role; appUrl.password=password;
    const port=await new Promise<number>(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const address=server.address();if (!address || typeof address==='string') throw new Error('No port');server.close(()=>resolve(address.port));});});
    const origin=`http://127.0.0.1:${port}`;
    child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','apps/catalog','--hostname','127.0.0.1','--port',String(port)],{
      stdio:['ignore','pipe','pipe'],detached:true,
      env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CATALOG_DATABASE_URL:appUrl.toString(),NEXT_PUBLIC_SUPABASE_URL:local.apiUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.publishableKey,CATALOG_APP_ORIGIN:origin},
    });
    // Drain logs without printing credentials or transient server internals.
    child.stdout?.on('data',()=>{}); child.stderr?.on('data',()=>{});
    child.on('error',()=>{});
    let ready=false;
    for(let i=0;i<90;i++) {
      try { const response=await fetch(`${origin}/contribute`,{signal:AbortSignal.timeout(2000)}); if(response.ok){ready=true;break;} } catch { /* Startup/compile in progress. */ }
      if(child.exitCode!==null) throw new Error('Next.js stopped before the HTTP tests');
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    assert.ok(ready,'Next.js did not start');
    const page=await (await fetch(`${origin}/contribute`)).text(); assert.ok(page.includes('Help improve the catalog'));
    type User = { id:string; token:string; browser:SupabaseClient; email:string; password:string };
    async function user():Promise<User> {
      const email=`catalog-http-${randomUUID()}@example.invalid`,password=`${randomUUID()}Aa1!`;
      const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'maintainer',maintainer:true}});
      assert.ok(created.data.user && !created.error,'Temporary Auth account failed'); users.push(created.data.user.id);
      const browser=createClient(local.apiUrl,local.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}}); browsers.push(browser);
      const login=await browser.auth.signInWithPassword({email,password}); assert.ok(login.data.session && !login.error,'Temporary sign-in failed');
      return {id:created.data.user.id,token:login.data.session.access_token,browser,email,password};
    }
    async function call(path:string,status:number,who?:User,body?:unknown,extra:Record<string,string>={}) {
      const response=await fetch(`${origin}/api/editorial/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{...(who?{Authorization:`Bearer ${who.token}`} : {}),...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30_000)});
      assert.ok(response.headers.get('content-type')?.includes('application/json'),`${path} returned HTTP ${response.status} without JSON; inspect the Next.js build`);
      const result=await response.json() as { data?: unknown; error?: { code: string } }; assert.equal(response.status,status,`${path}: ${result.error?.code ?? 'unexpected result'}`);
      assert.equal(response.headers.get('cache-control'),'private, no-store');
      return result.data as any;
    }
    const author=await user(),other=await user(),reviewer=await user();
    await db`insert into editorial.maintainers(user_id,reason) values (${reviewer.id},'Temporary HTTP verification')`;
    await call('session',401);
    await call('proposals/save',401,undefined,{});
    await call('session',401,undefined,undefined,{Authorization:'Bearer invalid.token.value'});
    assert.equal((await call('session',200,author)).maintainer,false,'User metadata must not grant maintainer rights');
    assert.equal((await call('session',200,reviewer)).maintainer,true);
    await call('proposals/save',403,author,{}, {Origin:'https://unrelated.example'});
    await call('proposals/save',401,undefined,{}, {Cookie:`access_token=${author.token}`});
    console.log('PASS Next.js sign-in identity, invalid/anonymous/cookie-only rejection, metadata isolation, origin checks, private caching');
    const content={title:'HTTP synthetic game',rationale:'Synthetic rulebook supports the name.',origin:'human',sources:[{...sourceFixture,id:sourceId}],targets:[{entity_id:entityId,base_revision_id:null,payload:{...game(919),id:entityId,name:'HTTP synthetic game'},evidence:[{path:'/name',source_id:sourceId,note:'Page 2'}]}]};
    const save={proposal_id:proposalId,expected_version:0,content};
    await call('proposals/save',400,author,{...save,state:'approved'});
    await call('proposals/save',200,author,save);
    await call(`proposals/${proposalId}`,404,other);
    await call('proposals/save',404,other,{...save,expected_version:1});
    await call('proposals/submit',404,other,{proposal_id:proposalId,expected_version:1});
    await call('comments',404,other,{proposal_id:proposalId,body:'Unauthorized'});
    const submitted=await call('proposals/submit',200,author,{proposal_id:proposalId,expected_version:1});
    await call('proposals/validate',403,author,{proposal_id:proposalId,expected_version:1});
    const checked=await call('proposals/validate',200,reviewer,{proposal_id:proposalId,expected_version:1});
    const review={proposal_id:proposalId,expected_version:1,submitted_hash:submitted.submitted_hash,validation_id:checked.id,decision:'approve',reason:'Human inspected synthetic evidence.',idempotency_key:randomUUID()};
    await call('proposals/review',403,author,review);
    await call('publish',404,author,{});
    await db`update editorial.maintainers set active=false where user_id=${reviewer.id}`;
    await call('proposals/review',403,reviewer,review);
    await db`update editorial.maintainers set active=true where user_id=${reviewer.id}`;
    const approved=await call('proposals/review',200,reviewer,review);
    assert.equal(approved.state,'approved');
    assert.deepEqual(await call('proposals/review',200,reviewer,review),approved);
    await call('proposals/review',409,reviewer,{...review,reason:'Different request'});
    await call('proposals/save',409,author,{...save,expected_version:1});
    console.log('PASS direct requests enforce draft ownership, review separation, current membership, approval terminal state, and idempotency');
    const quickId=randomUUID();
    const quick={contribution_id:quickId,content:{kind:'game',name:'HTTP name only'}};
    const recordsBefore=await call('records',200,author);
    await call('contributions',401,undefined,quick);
    await call('contributions',200,author,quick);
    await call('contributions',200,author,quick);
    await call('contributions',409,other,quick);
    await call('contributions',400,author,{...quick,author_id:reviewer.id});
    assert.equal((await call('contributions',200,author)).filter((item:{id:string})=>item.id===quickId).length,1);
    assert.equal((await call('contributions',200,other)).length,0);
    await call('contributions/triage',403,author,{contribution_id:quickId,state:'archived'});
    await call('contributions/triage',200,reviewer,{contribution_id:quickId,state:'archived'});
    assert.deepEqual(await call('records',200,author),recordsBefore);
    console.log('PASS minimal contribution intake, retry deduplication, privacy, maintainer triage, and unchanged approved records');
    if(process.argv.includes('--browser')) {
      visualBrowser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
      const contributorPage=await visualBrowser.newPage({viewport:{width:1200,height:900}});
      const reviewerPage=await visualBrowser.newPage({viewport:{width:1200,height:900}});
      async function login(page:Page,who:User) {
        await page.goto(`${origin}/contribute`);
        await page.getByLabel('Email',{exact:true}).fill(who.email);
        await page.getByLabel('Password',{exact:true}).fill(who.password);
        await page.getByRole('button',{name:'Sign in',exact:true}).click();
        await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
      }
      async function clickCommand(page:Page,label:string,path:string) {
        const pending=page.waitForResponse(response=>response.url().endsWith(`/api/editorial/v1/${path}`) && response.request().method()==='POST');
        await page.getByRole('button',{name:label,exact:true}).click();
        const response=await pending;
        const result=await response.json();
        if(path==='proposals/save' && response.ok()) {
          proposals.push(result.data.id);
          for(const target of result.data.draft.targets) if(!entities.includes(target.entity_id)) entities.push(target.entity_id);
          for(const source of result.data.draft.sources) if(!sources.includes(source.id)) sources.push(source.id);
        }
        assert.equal(response.status(),200,`Browser ${path}: ${result.error?.message ?? 'request failed'}`);
        await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
        return result.data as any;
      }
      async function cite(page:Page) {
        await page.getByLabel('Source URL',{exact:true}).fill('https://publisher.example/synthetic-rules');
        await page.getByLabel('Source title',{exact:true}).fill('Synthetic browser rulebook');
        await page.getByLabel('Publisher or author',{exact:true}).fill('Synthetic Publisher');
        await page.getByLabel('Page or section',{exact:true}).fill('Page 2');
        await page.getByLabel('Explain the change and how the source supports it',{exact:true}).fill('The synthetic source states these play specifications.');
      }
      await login(contributorPage,author);
      const name=`Browser synthetic ${randomBytes(4).toString('hex')}`;
      await expect(contributorPage.getByLabel('Edition name',{exact:true})).toHaveCount(0);
      await expect(contributorPage.locator('.quick-contribution [required]')).toHaveCount(1);
      await contributorPage.getByLabel('Game name',{exact:true}).fill(name);
      const quickGame=await clickCommand(contributorPage,'Send game','contributions');
      await expect(contributorPage.getByText('Thanks! Your submission has been received.',{exact:false})).toBeVisible();
      await contributorPage.reload();
      await expect(contributorPage.locator('.contribution-list')).toContainText(name);
      await contributorPage.getByRole('button',{name:'Suggest a correction',exact:true}).click();
      await contributorPage.getByLabel('What should we correct?',{exact:true}).fill('It also has a solo mode.');
      await contributorPage.getByRole('button',{name:'Report a problem',exact:true}).click();
      await contributorPage.getByLabel('What went wrong?',{exact:true}).fill('The rules link is broken.');
      await clickCommand(contributorPage,'Send report','contributions');
      await contributorPage.getByRole('button',{name:'Suggest a correction',exact:true}).click();
      await expect(contributorPage.getByLabel('What should we correct?',{exact:true})).toHaveValue('It also has a solo mode.');
      await contributorPage.getByRole('button',{name:'Add more information',exact:false}).click();
      await contributorPage.getByRole('button',{name:'Links or sources',exact:true}).click();
      const roughSource='  a book? page ?? <script>alert(1)</script>\nno link yet';
      await contributorPage.getByLabel('Links or sources (optional)',{exact:true}).fill(roughSource);
      // Simulate a committed write whose response is lost. A retry must preserve the text and ID.
      const endpoint='**/api/editorial/v1/contributions';
      await contributorPage.route(endpoint,async route=>{await route.fetch();await route.abort('failed');},{times:1});
      await contributorPage.getByRole('button',{name:'Send correction',exact:true}).click();
      await expect(contributorPage.getByRole('alert')).toBeVisible();
      await expect(contributorPage.getByLabel('Links or sources (optional)',{exact:true})).toHaveValue(roughSource);
      await clickCommand(contributorPage,'Send correction','contributions');
      const savedNotes=await call('contributions',200,author);
      assert.equal(savedNotes.filter((item:any)=>item.content.body==='It also has a solo mode.').length,1);
      assert.equal(savedNotes.find((item:any)=>item.content.body==='It also has a solo mode.').content.details[0].text,roughSource);
      await contributorPage.setViewportSize({width:390,height:844});
      await contributorPage.getByRole('button',{name:'Add a game',exact:true}).click();
      await contributorPage.getByRole('heading',{name:'Help improve the catalog',exact:true}).scrollIntoViewIfNeeded();
      await contributorPage.screenshot({path:'/tmp/catalog-quick-contribution-mobile.png'});
      assert.ok(await contributorPage.evaluate('document.documentElement.scrollWidth<=window.innerWidth'));
      await contributorPage.setViewportSize({width:1200,height:900});
      await login(reviewerPage,reviewer);
      const inboxGame=reviewerPage.locator('.contribution-list > li').filter({hasText:name});
      await inboxGame.getByRole('button',{name:'Archive',exact:true}).click();
      await expect(inboxGame).toContainText('Archived');
      await inboxGame.getByRole('button',{name:'Reopen',exact:true}).click();
      await expect(inboxGame).toContainText('Received');
      await inboxGame.getByRole('button',{name:'Prepare catalog change',exact:true}).click();
      await expect(reviewerPage.getByLabel('Catalog game name',{exact:true})).toHaveValue(name);
      assert.equal((await db`select content from editorial.contributions where id=${quickGame.id}`)[0]!.content.name,name);
      console.log('PASS browser name-only game, one-note correction/report, optional rough sources, draft retention, lost-response retry, mobile, and maintainer inbox');
      // The detailed editor is now a maintainer tool; continue testing its approval workflow.
      await db`insert into editorial.maintainers(user_id,reason) values (${author.id},'Temporary structured-editor browser verification')`;
      await contributorPage.getByRole('button',{name:'Refresh',exact:true}).click();
      await expect(contributorPage.locator('.catalog-editor')).toBeVisible();
      await contributorPage.locator('.catalog-editor > summary').click();
      await contributorPage.getByLabel('Catalog game name',{exact:true}).fill(name);
      await contributorPage.getByLabel('Edition name',{exact:true}).fill('Synthetic English edition');
      await contributorPage.getByLabel('Publication year (optional)',{exact:true}).fill('2025');
      await contributorPage.getByLabel('Edition language (optional)',{exact:true}).fill('en');
      await contributorPage.getByLabel('Supported player counts or minimum (optional)',{exact:true}).fill('2, 3, 4');
      await cite(contributorPage);
      const gameDraft=await clickCommand(contributorPage,'Save draft','proposals/save');
      const editionId=gameDraft.draft.targets.find((target:{payload:{entity_type:string}})=>target.payload.entity_type==='edition').entity_id;
      await clickCommand(contributorPage,'Submit for review','proposals/submit');
      async function decide(title:string,decision:string) {
        await reviewerPage.getByRole('button',{name:'Refresh',exact:true}).click();
        await expect(reviewerPage.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
        await reviewerPage.getByRole('button',{name:title,exact:true}).click();
        await clickCommand(reviewerPage,'Check current proposal','proposals/validate');
        await expect(reviewerPage.getByText('Structural and evidence checks passed.',{exact:false})).toBeVisible();
        await reviewerPage.getByLabel('Decision',{exact:true}).selectOption(decision);
        await reviewerPage.getByLabel('Decision reason, including any warnings',{exact:true}).fill('Human verified the synthetic source and exact version.');
        await reviewerPage.getByLabel('I reviewed this version and its supporting evidence.',{exact:true}).check();
        await reviewerPage.getByRole('heading',{name:'Review checks',exact:true}).scrollIntoViewIfNeeded();
        await reviewerPage.screenshot({path:'/tmp/catalog-review.png'});
        await clickCommand(reviewerPage,'Record decision','proposals/review');
      }
      await decide(`Add ${name}`,'approve');
      assert.equal((await db`select count(*)::int n from editorial.revisions r join editorial.approvals a on a.id=r.approval_id where a.proposal_id=${gameDraft.id}`)[0]!.n,2);
      await contributorPage.getByRole('button',{name:'Refresh',exact:true}).click();
      await expect(contributorPage.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
      await contributorPage.locator('.catalog-editor > summary').click();
      await contributorPage.getByRole('button',{name:'Correct edition details',exact:true}).click();
      await contributorPage.getByLabel('Edition',{exact:true}).selectOption(editionId);
      await expect(contributorPage.getByLabel('Supported player counts or minimum (optional)',{exact:true})).toHaveValue('2, 3, 4');
      await contributorPage.getByLabel('Supported player counts or minimum (optional)',{exact:true}).fill('1, 2, 3, 4');
      await cite(contributorPage);
      const correctionDraft=await clickCommand(contributorPage,'Save draft','proposals/save');
      await clickCommand(contributorPage,'Submit for review','proposals/submit');
      await decide('Correct edition play details','request_changes');
      await contributorPage.getByRole('button',{name:'Correct edition play details',exact:true}).click();
      await expect(contributorPage.getByRole('button',{name:'Revise draft',exact:true})).toBeEnabled();
      await contributorPage.getByRole('button',{name:'Revise draft',exact:true}).click();
      await expect(contributorPage.getByLabel('Supported player counts or minimum (optional)',{exact:true})).toHaveValue('1, 2, 3, 4');
      await contributorPage.getByLabel('Page or section',{exact:true}).fill('Page 2, player count table');
      await clickCommand(contributorPage,'Save draft','proposals/save');
      await clickCommand(contributorPage,'Submit for review','proposals/submit');
      await decide('Correct edition play details','approve');
      assert.equal((await db`select version from editorial.proposals where id=${correctionDraft.id}`)[0]!.version,2);
      const [editionHead]=await db`select r.payload from editorial.revisions r join editorial.approved_heads h on h.revision_id=r.id where h.entity_id=${editionId}`;
      assert.deepEqual(editionHead!.payload.play_specifications[0].player_support.counts,[1,2,3,4]);
      await contributorPage.setViewportSize({width:390,height:844});
      await contributorPage.getByRole('heading',{name:'Help improve the catalog',exact:true}).scrollIntoViewIfNeeded();
      await contributorPage.screenshot({path:'/tmp/catalog-contribution-mobile.png'});
      assert.ok(await contributorPage.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'Mobile viewport must not overflow horizontally');
      await contributorPage.getByRole('button',{name:'Sign out',exact:true}).click();
      await expect(contributorPage.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
      await db`delete from editorial.maintainers where user_id=${author.id}`;
      await visualBrowser.close(); visualBrowser=undefined;
      console.log('PASS browser sign-in, two-target game form, review, player-count correction, changes requested, revision, approval, mobile layout, and sign-out');
    }
    const refresh=await author.browser.auth.refreshSession(); assert.ok(refresh.data.session); author.token=refresh.data.session.access_token;
    await call('session',200,author);
    const logout=await author.browser.auth.signOut({scope:'local'}); assert.ok(!logout.error);
    await call('session',401,author);
    await call('proposals/save',401,author,{...save,expected_version:1});
    const reviewerSession=JSON.parse(Buffer.from(reviewer.token.split('.')[1]!,'base64url').toString()).session_id;
    await db`update auth.sessions set not_after=now()-interval '1 minute' where id=${reviewerSession}`;
    await call('proposals/review',401,reviewer,review);
    await admin.auth.admin.deleteUser(other.id);
    await call('session',401,other);
    console.log('PASS real session refresh, sign-out JWT replay rejection, session expiry, and deleted-user rejection');
    const restricted=postgres(appUrl.toString(),{max:1,prepare:false});
    try { await assert.rejects(restricted`insert into editorial.maintainers(user_id,reason) values (${randomUUID()},'Unauthorized')`); await assert.rejects(restricted`select * from auth.users`); await assert.rejects(restricted`select * from catalog.releases`); }
    finally { await restricted.end(); }
    console.log('PASS application login cannot grant membership, read Auth users, or access publication storage');
  } finally {
    await visualBrowser?.close();
    if(child?.pid && child.exitCode===null) { process.kill(-child.pid,'SIGTERM'); await once(child,'exit'); }
    try {
      await db.begin(async tx=>{
        await tx`set local session_replication_role=replica`;
        if(proposals.length) {
          await tx`delete from editorial.revision_evidence where revision_id in (select id from editorial.revisions where entity_id in ${tx(entities)})`;
          await tx`delete from editorial.revision_references where revision_id in (select id from editorial.revisions where entity_id in ${tx(entities)})`;
          await tx`delete from editorial.approved_heads where entity_id in ${tx(entities)}`;
          await tx`delete from editorial.revisions where entity_id in ${tx(entities)}`;
          await tx`delete from editorial.approvals where proposal_id in ${tx(proposals)}`;
          for(const table of ['decisions','validations','comments','proposal_events','proposal_targets','proposal_versions']) await tx`delete from ${tx(`editorial.${table}`)} where proposal_id in ${tx(proposals)}`;
          await tx`delete from editorial.proposals where id in ${tx(proposals)}`;
          await tx`delete from editorial.identifier_claims where entity_id in ${tx(entities)}`;
          await tx`delete from editorial.entities where id in ${tx(entities)}`;
          await tx`delete from editorial.sources where id in ${tx(sources)}`;
        }
        if(users.length) {
          await tx`delete from editorial.contributions where author_id in ${tx(users)}`;
          await tx`delete from editorial.command_results where actor_id in ${tx(users)}`;
          await tx`delete from editorial.rate_limits where actor_id in ${tx(users)}`;
          await tx`delete from editorial.maintainers where user_id in ${tx(users)}`;
        }
      });
      for(const browser of browsers) await browser.auth.signOut({scope:'local'});
      for(const id of users) { const result=await admin.auth.admin.deleteUser(id); if(result.error && result.error.status!==404) throw new Error('Temporary Auth account cleanup failed'); }
      if(createdRole) await db.unsafe(`drop role ${role}`);
      console.log('PASS synthetic editorial data, accounts, and temporary application role removed');
    } finally { await db.end(); }
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Editorial HTTP verification failed');process.exitCode=1;});
