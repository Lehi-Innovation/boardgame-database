import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { connectDatabase, EditorialService, type CatalogDatabase } from '@catalog/database';
import { CommandError, contentHash, type Actor } from '@catalog/domain';
import { ProposalContent, type CatalogRecord } from '@catalog/contracts';
import { game, sourceFixture } from './fixtures/catalog.js';

const connection = connectDatabase(process.env.CATALOG_TEST_DATABASE_URL!);
const db = connection.db;
const actor = (): Actor => ({ userId: randomUUID(), sessionId: randomUUID(), expiresAt: Date.now()/1000 + 3600 });
const author = actor(), stranger = actor(), maintainer = actor();
const restricted = { transaction: <T>(fn: Parameters<CatalogDatabase['transaction']>[0]) => db.transaction(async tx => { await tx.execute(sql`set local role catalog_editor`); return fn(tx); }) } as CatalogDatabase;
const service = new EditorialService(restricted);
const json = (value: unknown) => sql`${JSON.stringify(value)}::jsonb`;
const expect = (status: number) => (error: unknown) => error instanceof CommandError && error.status === status;
function content(name = 'Synthetic proposal'): typeof ProposalContent._output {
  const id = randomUUID(), sourceId = randomUUID();
  return ProposalContent.parse({ title: name, rationale: 'Synthetic sourced statement for workflow verification.', origin: 'human', sources: [{ ...sourceFixture, id: sourceId }], targets: [{ entity_id: id, base_revision_id: null, payload: { ...game(700), id, name }, evidence: [{ path: '/name', source_id: sourceId, note: 'Page 2' }] }] });
}
async function submit(value = content(), who = author) {
  const saved = await service.save(who, { proposal_id: randomUUID(), expected_version: 0, content: value });
  const submitted = await service.submit(who, { proposal_id: saved.id, expected_version: saved.version });
  return { saved, submitted, content: value };
}
async function reviewInput(item: Awaited<ReturnType<typeof submit>>) {
  const validation = await service.validate(maintainer, { proposal_id: item.saved.id, expected_version: item.saved.version });
  return { proposal_id: item.saved.id, expected_version: item.saved.version, submitted_hash: item.submitted.submitted_hash, validation_id: validation.id, decision: 'approve' as const, reason: 'Human reviewed the source and all changes.', idempotency_key: randomUUID() };
}
async function correction(entityId: string, name: string) {
  const records = await service.records(author);
  const current = records.find(record => record.entity_id === entityId)!;
  const value = content(name);
  value.targets = [{ ...value.targets[0]!, entity_id: entityId, base_revision_id: current.revision_id, payload: { ...current.payload, name } as CatalogRecord }];
  return value;
}
before(async () => {
  for (const who of [author,stranger,maintainer]) await db.execute(sql`insert into auth.sessions(id,user_id) values (${who.sessionId},${who.userId})`);
  await db.execute(sql`insert into editorial.maintainers(user_id,reason) values (${maintainer.userId},'Synthetic tests')`);
});
after(() => connection.close());

test('quick intake accepts minimal and messy input without changing the catalog; retries and triage are authorized', async () => {
  const before = await service.records(author);
  const command = { contribution_id: randomUUID(), content: { kind: 'game', name: 'A name only' } };
  const [first, retry] = await Promise.all([service.contribute(author, command), service.contribute(author, command)]);
  assert.deepEqual(first, retry);
  await assert.rejects(service.contribute(stranger, command), expect(409));
  await assert.rejects(service.contribute(author, { ...command, content: { ...command.content, name: 'Different' } }), expect(409));
  for (const kind of ['correction', 'problem']) await service.contribute(author, { contribution_id: randomUUID(), content: { kind, body: '  I think this is wrong?\n', details: [{ category: 'links', text: 'not a URL <script>example</script>' }] } });
  const own = await service.contributions(author);
  assert.equal(own.length, 3);
  assert.equal((await service.contributions(stranger)).length, 0);
  assert.equal((await service.contributions(maintainer)).length, 3);
  assert.equal(JSON.stringify(own).includes('  I think this is wrong?\\n'), true);
  assert.deepEqual(await service.records(author), before);
  await assert.rejects(service.triageContribution(author, { contribution_id: first.id, state: 'archived' }), expect(403));
  await service.triageContribution(maintainer, { contribution_id: first.id, state: 'archived' });
  assert.equal((await service.contributions(author)).find(row => row.id === first.id)!.state, 'archived');
  await db.execute(sql`update editorial.maintainers set active=false where user_id=${maintainer.userId}`);
  await assert.rejects(service.triageContribution(maintainer, { contribution_id: first.id, state: 'received' }), expect(403));
  await db.execute(sql`update editorial.maintainers set active=true where user_id=${maintainer.userId}`);
  await service.triageContribution(maintainer, { contribution_id: first.id, state: 'received' });
  await assert.rejects(service.contribute({ ...author, expiresAt: 0 }, command), expect(401));
  await assert.rejects(restricted.transaction(tx => tx.execute(sql`update editorial.contributions set content='{}'::jsonb where id=${first.id}`)));
  await assert.rejects(restricted.transaction(tx => tx.execute(sql`delete from editorial.contributions where id=${first.id}`)));
  for (const role of ['anon', 'authenticated', 'catalog_reader', 'catalog_publisher']) await assert.rejects(db.transaction(async tx => {
    await tx.execute(sql.raw(`set local role ${role}`));
    await tx.execute(sql`select * from editorial.contributions`);
  }));
});

test('drafts have server-supplied authors, version checks, and per-command ownership', async () => {
  const draft = await service.save(author, { proposal_id: randomUUID(), expected_version: 0, content: content() });
  await assert.rejects(service.detail(stranger, draft.id), expect(404));
  await assert.rejects(service.save(stranger, { proposal_id: draft.id, expected_version: 1, content: content() }), expect(404));
  await assert.rejects(service.submit(stranger, { proposal_id: draft.id, expected_version: 1 }), expect(404));
  await assert.rejects(service.withdraw(stranger, { proposal_id: draft.id, expected_version: 1 }), expect(404));
  await assert.rejects(service.comment(stranger, { proposal_id: draft.id, body: 'Unauthorized' }), expect(404));
  await assert.rejects(service.save(author, { proposal_id: draft.id, expected_version: 9, content: content() }), expect(409));
  assert.throws(() => service.save(author, { proposal_id: draft.id, expected_version: 1, content: content(), state: 'approved' }));
  await service.detail(maintainer, draft.id);
});
test('submission blocks missing evidence, invalid references, and source conflicts', async () => {
  const value = content(); value.targets[0]!.evidence = [];
  const draft = await service.save(author, { proposal_id: randomUUID(), expected_version: 0, content: value });
  await assert.rejects(service.submit(author, { proposal_id: draft.id, expected_version: 1 }), expect(422));
  assert.equal((await service.detail(author, draft.id)).state, 'draft');
  const missing = content(); (missing.targets[0]!.payload as ReturnType<typeof game>).designers = [randomUUID()];
  const second = await service.save(author, { proposal_id: randomUUID(), expected_version: 0, content: missing });
  await assert.rejects(service.submit(author, { proposal_id: second.id, expected_version: 1 }), expect(422));
  const source = content().sources[0]!;
  await db.execute(sql`insert into editorial.sources(id,payload) values (${source.id},${json(source)})`);
  const changedSource = content(); changedSource.sources=[{...source,title:'Changed immutable citation'}];
  changedSource.targets[0]!.evidence=[{path:'/name',source_id:source.id,note:null}];
  const third=await service.save(author,{proposal_id:randomUUID(),expected_version:0,content:changedSource});
  await assert.rejects(service.submit(author,{proposal_id:third.id,expected_version:1}),error=>error instanceof CommandError && Array.isArray(error.fields) && error.fields.some((field:{code:string})=>field.code==='source_conflict'));
});
test('only a current maintainer can validate or review; revocation applies to retries', async () => {
  const item = await submit(); const command = await reviewInput(item);
  await assert.rejects(service.validate(author, { proposal_id: item.saved.id, expected_version: 1 }), expect(403));
  await assert.rejects(service.review(author, command), expect(403));
  const result = await service.review(maintainer, command);
  assert.equal(result.state, 'approved');
  await db.execute(sql`update editorial.maintainers set active=false where user_id=${maintainer.userId}`);
  await assert.rejects(service.review(maintainer, command), expect(403));
  await db.execute(sql`update editorial.maintainers set active=true where user_id=${maintainer.userId}`);
});
test('approval is idempotent under simultaneous retries and rejects changed key content', async () => {
  const item = await submit(); const command = await reviewInput(item);
  const [one,two] = await Promise.all([service.review(maintainer,command),service.review(maintainer,command)]);
  assert.deepEqual(one,two);
  await assert.rejects(service.review(maintainer,{...command,reason:'Changed content'}),expect(409));
  assert.equal((await db.execute(sql`select count(*)::int n from editorial.approvals where proposal_id=${item.saved.id}`))[0]!.n,1);
  assert.equal((await db.execute(sql`select count(*)::int n from catalog.releases`))[0]!.n,0);
});
test('a revised submission invalidates old hashes, decisions, and validations', async () => {
  const item = await submit(); const old = await reviewInput(item);
  const content = { ...item.content, rationale: 'Updated explanation for review.' };
  await service.save(author,{proposal_id:item.saved.id,expected_version:1,content});
  await assert.rejects(service.review(maintainer,old),expect(409));
  await service.submit(author,{proposal_id:item.saved.id,expected_version:2});
  await assert.rejects(service.review(maintainer,{...old,expected_version:2,submitted_hash:contentHash(content)}),expect(409));
  const detail = await service.detail(author,item.saved.id);
  assert.equal(detail.versions.length,2);
  assert.ok(detail.events.some(event => event.event === 'version_withdrawn'));
});
test('request changes permits a new draft; rejection and withdrawal are terminal', async () => {
  const item = await submit(); const command = await reviewInput(item);
  await service.review(maintainer,{...command,decision:'request_changes'});
  await assert.rejects(service.submit(author,{proposal_id:item.saved.id,expected_version:1}),expect(409));
  await service.save(author,{proposal_id:item.saved.id,expected_version:1,content:item.content});
  await service.withdraw(author,{proposal_id:item.saved.id,expected_version:2});
  await assert.rejects(service.save(author,{proposal_id:item.saved.id,expected_version:2,content:item.content}),expect(409));
  const rejected = await submit(); const reject = await reviewInput(rejected);
  await service.review(maintainer,{...reject,decision:'reject'});
  await assert.rejects(service.save(author,{proposal_id:rejected.saved.id,expected_version:1,content:rejected.content}),expect(409));
});
test('changed catalog context requires new validation; stale target bases require rebasing', async () => {
  const original = await submit(); await service.review(maintainer,await reviewInput(original));
  const a = await submit(await correction(original.content.targets[0]!.entity_id,'Revision A'));
  const b = await submit(await correction(original.content.targets[0]!.entity_id,'Revision B'));
  const commandA = await reviewInput(a), commandB = await reviewInput(b);
  await service.review(maintainer,commandA);
  await assert.rejects(service.review(maintainer,commandB),expect(409));
  const checked = await service.validate(maintainer,{proposal_id:b.saved.id,expected_version:1});
  assert.ok(checked.errors.some(error=>error.code==='stale_base'));
  await assert.rejects(service.review(maintainer,{...commandB,validation_id:checked.id}),expect(409));
});
test('unrelated dependency changes cannot be silently approved with an old validation', async () => {
  const a = await submit(), b = await submit(); const commandA = await reviewInput(a), commandB = await reviewInput(b);
  await service.review(maintainer,commandA);
  await assert.rejects(service.review(maintainer,commandB),expect(409));
  const checked = await service.validate(maintainer,{proposal_id:b.saved.id,expected_version:1});
  await service.review(maintainer,{...commandB,validation_id:checked.id});
});
test('late multi-target persistence failure rolls back approvals, heads, revisions and sources', async () => {
  const value = content(); const other = content('Second target');
  value.targets.push(...other.targets); value.sources.push(...other.sources);
  const item = await submit(value); const command = await reviewInput(item);
  const failingId = value.targets[1]!.entity_id;
  await db.execute(sql.raw(`create function editorial.test_fail_revision() returns trigger language plpgsql as $$ begin if new.entity_id = '${failingId}'::uuid then raise exception 'Synthetic failure'; end if; return new; end $$`));
  await db.execute(sql`create trigger test_failure before insert on editorial.revisions for each row execute function editorial.test_fail_revision()`);
  try { await assert.rejects(service.review(maintainer,command)); }
  finally { await db.execute(sql`drop trigger test_failure on editorial.revisions`); await db.execute(sql`drop function editorial.test_fail_revision()`); }
  assert.equal((await service.detail(author,item.saved.id)).state,'submitted');
  assert.equal((await db.execute(sql`select count(*)::int n from editorial.approvals where proposal_id=${item.saved.id}`))[0]!.n,0);
  for (const target of value.targets) assert.equal((await db.execute(sql`select count(*)::int n from editorial.approved_heads where entity_id=${target.entity_id}`))[0]!.n,0);
  for (const source of value.sources) assert.equal((await db.execute(sql`select count(*)::int n from editorial.sources where id=${source.id}`))[0]!.n,0);
  await service.review(maintainer,command);
});
test('unchanged evidence survives a correction and self-review is recorded', async () => {
  const value = content(); const target = value.targets[0]!;
  (target.payload as ReturnType<typeof game>).first_published_year=2020;
  target.evidence.push({path:'/first_published_year',source_id:value.sources[0]!.id,note:null});
  const item = await submit(value,maintainer); await service.review(maintainer,await reviewInput(item));
  const next = await submit(await correction(target.entity_id,'Renamed synthetic game')); await service.review(maintainer,await reviewInput(next));
  const evidence = await db.execute(sql`select e.field_path from editorial.revision_evidence e join editorial.approved_heads h on h.revision_id=e.revision_id where h.entity_id=${target.entity_id}`);
  assert.ok(evidence.some(row=>row.field_path==='/first_published_year'));
  const detail = await service.detail(maintainer,item.saved.id);
  assert.equal(detail.decisions[0]!.self_review,true);
});
test('revoked, expired, and mismatched sessions are denied for reads and commands', async () => {
  await assert.rejects(service.list({...author,expiresAt:0}),expect(401));
  await assert.rejects(service.list({...author,userId:stranger.userId}),expect(401));
  await db.execute(sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${stranger.sessionId}`);
  await assert.rejects(service.save(stranger,{proposal_id:randomUUID(),expected_version:0,content:content()}),expect(401));
  await db.execute(sql`delete from auth.sessions where id=${stranger.sessionId}`);
  await assert.rejects(service.list(stranger),expect(401));
});
test('editor credentials cannot grant membership, read Auth secrets, or publish', async () => {
  for (const query of [sql`insert into editorial.maintainers(user_id,reason) values (${author.userId},'Escalate')`,sql`update editorial.maintainers set active=true`,sql`select * from auth.sessions`,sql`insert into catalog.releases(id,schema_version,contract_version) values ('r888888',1,'test')`]) await assert.rejects(restricted.transaction(tx=>tx.execute(query)));
});
test('reports stay private and the durable per-actor limiter is bounded', async () => {
  const id=randomUUID(); await service.report(author,{report_id:id,entity_id:null,body:'Synthetic unresolved report',sources:[]});
  assert.ok((await service.reports(author)).some(row=>row.id===id));
  assert.ok((await service.reports(maintainer)).some(row=>row.id===id));
  for(let i=0;i<60;i++) assert.equal(await service.consume(author),true);
  assert.equal(await service.consume(author),false);
});
