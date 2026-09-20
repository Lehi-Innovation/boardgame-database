import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql as query } from 'drizzle-orm';
import { insertApprovedRevision, readPublishedDocument, schema } from '@catalog/database';
import { contentHash, referencesOf } from '@catalog/domain';
import { catalogFixture, game, id, sourceFixture } from './fixtures/catalog.js';

if (!process.env.CATALOG_TEST_DATABASE_URL) throw new Error('Use npm run test:db; this file requires a disposable migrated database');
const sql = postgres(process.env.CATALOG_TEST_DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
after(() => sql.end());
const db = drizzle(sql, { schema });
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const rollback = new Error('Roll back test fixture');
const records = catalogFixture();
const revisionId = (entityId: string) => id(Number(entityId.slice(-12)) + 1000);
const proposalId = id(800);
const approvalId = id(801);
const json = (value: unknown) => JSON.stringify(value);

async function fixture(tx: Transaction) {
  for (const record of records) await tx.execute(query`insert into editorial.entities(id, entity_type) values (${record.id}, ${record.entity_type})`);
  const content = { title: 'Synthetic fixture', rationale: 'Database invariants', origin: 'human', sources: [sourceFixture], targets: records.map(payload => ({ entity_id: payload.id, base_revision_id: null, payload, evidence: [] })) };
  await tx.execute(query`insert into editorial.proposals(id, author_id, draft) values (${proposalId}, ${id(999)}, ${json(content)})`);
  await tx.execute(query`insert into editorial.proposal_versions(proposal_id, version, content, content_hash) values (${proposalId}, 1, ${json(content)}, ${contentHash(content)})`);
  for (const record of records) await tx.execute(query`insert into editorial.proposal_targets(proposal_id, proposal_version, entity_id, payload) values (${proposalId}, 1, ${record.id}, ${json(record)})`);
  await tx.execute(query`insert into editorial.approvals(id, proposal_id, proposal_version, submitted_hash, reviewer_id, reason, validator_version) values (${approvalId}, ${proposalId}, 1, ${contentHash(content)}, ${id(999)}, 'Synthetic review', 'm1')`);
  await tx.execute(query`insert into editorial.sources(id, payload) values (${sourceFixture.id}, ${json(sourceFixture)})`);
  for (const record of records) {
    await insertApprovedRevision(tx, { revision_id: revisionId(record.id), approval_id: approvalId, payload: record, evidence: [{ path: '/id', source_id: sourceFixture.id, note: null }] });
    await tx.execute(query`insert into editorial.approved_heads(entity_id, revision_id) values (${record.id}, ${revisionId(record.id)})`);
  }
}
async function isolated(check: (tx: Transaction) => Promise<void>) {
  try {
    await db.transaction(async tx => { await fixture(tx); await check(tx); throw rollback; });
  } catch (error) { if (error !== rollback) throw error; }
}
async function rejects(tx: Transaction, code: string, action: (savepoint: Transaction) => Promise<unknown>) {
  await assert.rejects(tx.transaction(action), (error: unknown) => {
    let current = error;
    while (current instanceof Error) {
      if ('code' in current && current.code === code) return true;
      current = current.cause;
    }
    return false;
  });
}
async function release(tx: Transaction, name: string, ready = false) {
  await tx.execute(query`insert into catalog.releases(id, schema_version, contract_version) values (${name}, 1, '0.1.0')`);
  for (const record of records) {
    await tx.execute(query`insert into catalog.release_members(release_id, entity_id, revision_id, entity_type) values (${name}, ${record.id}, ${revisionId(record.id)}, ${record.entity_type})`);
    await tx.execute(query`insert into catalog.documents(release_id, entity_id, document) values (${name}, ${record.id}, ${json(record)})`);
  }
  if (ready) await tx.execute(query`update catalog.releases set state = 'ready', ready_at = now(), manifest = '{}'::jsonb where id = ${name}`);
}

test('migration protects every internal table and grants no browser access', async () => {
  const tables = await sql`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('editorial','catalog','operations') and c.relkind = 'r'`;
  assert.ok(tables.length >= 15);
  assert.ok(tables.every(row => row.relrowsecurity));
  for (const role of ['anon', 'authenticated', 'service_role']) {
    const grants = await sql`select n.nspname, has_schema_privilege(${role}, n.oid, 'USAGE') allowed from pg_namespace n where n.nspname in ('editorial','catalog','operations')`;
    assert.ok(grants.every(row => !row.allowed));
  }
  const functions = await sql`select p.oid::regprocedure::text name, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('editorial','catalog','operations')`;
  assert.ok(functions.every(fn => !fn.prosecdef && fn.proconfig?.some((setting: string) => setting.startsWith('search_path='))));
});
test('legacy identity and external identifier strings survive PostgreSQL', () => isolated(async tx => {
  await tx.execute(query`insert into editorial.import_mappings values ('legacy_yaml', '007', ${id(1)}, ${'a'.repeat(64)})`);
  await tx.execute(query`insert into editorial.identifier_claims values ('bgg', '0007', ${id(1)})`);
  assert.equal((await tx.execute(query`select legacy_id from editorial.import_mappings`))[0]!.legacy_id, '007');
  assert.equal((await tx.execute(query`select value from editorial.identifier_claims`))[0]!.value, '0007');
  await rejects(tx, '23505', t => t.execute(query`insert into editorial.identifier_claims values ('bgg', '0007', ${id(2)})`));
  await rejects(tx, '23505', t => t.execute(query`insert into editorial.import_mappings values ('legacy_yaml', '007', ${id(2)}, ${'a'.repeat(64)})`));
}));
test('heads, proposal bases, and release membership must use the same entity as the revision', () => isolated(async tx => {
  await rejects(tx, '23503', t => t.execute(query`update editorial.approved_heads set revision_id = ${revisionId(id(2))} where entity_id = ${id(1)}`));
  const content = { targets: [{ entity_id: id(1), base_revision_id: revisionId(id(2)), payload: game(1) }] };
  await tx.execute(query`insert into editorial.proposal_versions(proposal_id, version, content, content_hash) values (${proposalId}, 2, ${json(content)}, ${'b'.repeat(64)})`);
  await rejects(tx, '23503', t => t.execute(query`insert into editorial.proposal_targets values (${proposalId}, 2, ${id(1)}, ${revisionId(id(2))}, ${json(game(1))})`));
  await tx.execute(query`insert into catalog.releases(id, schema_version, contract_version) values ('r000001', 1, '0.1.0')`);
  await rejects(tx, '23503', t => t.execute(query`insert into catalog.release_members values ('r000001', ${id(1)}, ${revisionId(id(2))}, 'game')`));
}));
test('approvals are bound to the submitted version hash and exact target payload', () => isolated(async tx => {
  await tx.execute(query`insert into editorial.proposal_versions(proposal_id,version,content,content_hash) values (${proposalId},9,'{}',${'9'.repeat(64)})`);
  await rejects(tx, '23503', t => t.execute(query`insert into editorial.approvals values (${id(810)}, ${proposalId}, 9, ${'0'.repeat(64)}, ${id(999)}, 'Wrong content', 'm1', now())`));
  const altered = { ...records[0]!, name: 'Changed after approval' };
  await rejects(tx, '23514', t => t.execute(query`insert into editorial.revisions(id, entity_id, entity_type, schema_version, payload, payload_hash, approval_id) values (${id(9000)}, ${id(1)}, 'game', 1, ${json(altered)}, ${contentHash(altered)}, ${approvalId})`));
}));
test('revision references match extracted payload references and enforce target types', () => isolated(async tx => {
  for (const record of records) {
    const actual = await tx.execute(query`select field_path, target_id, target_type, relation from editorial.revision_references where revision_id=${revisionId(record.id)} order by field_path`);
    const expected = referencesOf(record).map(ref => ({ field_path: ref.path, target_id: ref.target_id, target_type: ref.target_type, relation: ref.relation })).sort((a,b) => a.field_path.localeCompare(b.field_path));
    assert.deepEqual([...actual], expected);
  }
  await rejects(tx, '23503', t => t.execute(query`insert into editorial.revision_references values (${revisionId(id(1))}, '/missing', ${id(9999)}, 'game', 'expands')`));
  await rejects(tx, '23503', t => t.execute(query`insert into editorial.revision_references values (${revisionId(id(1))}, '/wrong_type', ${id(11)}, 'person', 'designers')`));
}));
test('submitted content, approved history, citations, references, and evidence cannot be rewritten', () => isolated(async tx => {
  for (const table of ['entities', 'proposal_versions', 'proposal_targets', 'approvals', 'revisions', 'revision_references', 'sources', 'revision_evidence']) {
    await rejects(tx, '23514', t => t.execute(query.raw(`delete from editorial.${table}`)));
  }
  await rejects(tx, '23514', t => t.execute(query`update editorial.revisions set payload_hash = ${'f'.repeat(64)}`));
}));
test('reader sees ready snapshots only; editorial and publisher privileges are separate', () => isolated(async tx => {
  await release(tx, 'r000001', true);
  await release(tx, 'r000002');
  assert.equal(await readPublishedDocument(tx, 'r000002', id(1)), null);
  assert.equal((await readPublishedDocument(tx, 'r000001', id(1)))?.name, '007');
  await tx.execute(query`set local role catalog_reader`);
  assert.deepEqual([...(await tx.execute(query`select id from catalog.releases`))].map(row => row.id), ['r000001']);
  assert.equal((await tx.execute(query`select count(*)::int n from catalog.documents`))[0]!.n, records.length);
  await rejects(tx, '42501', t => t.execute(query`select * from editorial.proposals`));
  await rejects(tx, '42501', t => t.execute(query`update catalog.releases set state = 'failed'`));
  await tx.execute(query`reset role`);
  await tx.execute(query`set local role catalog_editor`);
  await rejects(tx, '42501', t => t.execute(query`select * from catalog.documents`));
  await tx.execute(query`reset role`);
  await tx.execute(query`set local role catalog_publisher`);
  await rejects(tx, '42501', t => t.execute(query`insert into editorial.entities(id,entity_type) values (${id(99999)}, 'game')`));
}));
test('ready release contents and membership remain immutable', () => isolated(async tx => {
  await release(tx, 'r000001', true);
  await release(tx, 'r000002');
  await rejects(tx, '23514', t => t.execute(query`update catalog.documents set document = ${json(game(1, { name: 'Changed' }))} where release_id='r000001' and entity_id=${id(1)}`));
  await rejects(tx, '23514', t => t.execute(query`delete from catalog.release_members where release_id='r000001'`));
  await rejects(tx, '23514', t => t.execute(query`update catalog.releases set state='building' where id='r000001'`));
  await rejects(tx, '23514', t => t.execute(query`update catalog.documents set release_id='r000002' where release_id='r000001'`));
  await rejects(tx, '23514', t => t.execute(query`insert into catalog.releases(id,state,schema_version,contract_version,ready_at,manifest) values ('r000003','ready',1,'0.1.0',now(),'{}')`));
}));
test('release cannot become ready with missing documents or unresolved references', () => isolated(async tx => {
  await release(tx, 'r000001');
  await tx.execute(query`delete from catalog.documents where release_id='r000001' and entity_id=${id(101)}`);
  await rejects(tx, '23514', t => t.execute(query`update catalog.releases set state='ready', ready_at=now(), manifest='{}' where id='r000001'`));
  await tx.execute(query`delete from catalog.release_members where release_id='r000001' and entity_id=${id(101)}`);
  await rejects(tx, '23514', t => t.execute(query`update catalog.releases set state='ready', ready_at=now(), manifest='{}' where id='r000001'`));
}));
test('activation requires a ready release and rollback advances its generation', () => isolated(async tx => {
  await release(tx, 'r000001', true);
  await release(tx, 'r000002');
  await rejects(tx, '23503', t => t.execute(query`insert into catalog.current_release(release_id) values ('r000002')`));
  await tx.execute(query`insert into catalog.current_release(release_id) values ('r000001')`);
  await tx.execute(query`update catalog.releases set state='ready', ready_at=now(), manifest='{}' where id='r000002'`);
  await tx.execute(query`update catalog.current_release set release_id='r000002'`);
  await tx.execute(query`update catalog.current_release set release_id='r000001'`);
  assert.equal((await tx.execute(query`select generation::int from catalog.current_release`))[0]!.generation, 3);
}));
test('browser roles cannot query or mutate internal catalog tables', () => isolated(async tx => {
  for (const role of ['anon','authenticated','service_role']) {
    await tx.execute(query.raw(`set local role ${role}`));
    await rejects(tx, '42501', t => t.execute(query`select * from catalog.documents`));
    await rejects(tx, '42501', t => t.execute(query`insert into editorial.entities(id,entity_type) values (${id(5000)}, 'game')`));
    await tx.execute(query`reset role`);
  }
}));

test('publisher can build a release but cannot read proposal drafts', () => isolated(async tx => {
  await tx.execute(query`set local role catalog_publisher`);
  await release(tx, 'r000001', true);
  await rejects(tx, '42501', t => t.execute(query`select * from editorial.proposals`));
}));

test('a target cannot be appended to a submitted version with different content', () => isolated(async tx => {
  await tx.execute(query`insert into editorial.entities(id, entity_type) values (${id(77)}, 'game')`);
  await rejects(tx, '23514', t => t.execute(query`insert into editorial.proposal_targets(proposal_id,proposal_version,entity_id,payload) values (${proposalId},1,${id(77)},${json(game(77))})`));
}));

test('failed evidence insert rolls back the revision and all related writes', () => isolated(async tx => {
  const record = game(77, { designers: [id(10)] });
  const content = { targets: [{ entity_id: record.id, base_revision_id: null, payload: record }] };
  await rejects(tx, '23503', async t => {
    await t.execute(query`set local role catalog_editor`);
    await t.execute(query`insert into editorial.entities(id, entity_type) values (${record.id}, 'game')`);
    await t.execute(query`insert into editorial.proposal_versions(proposal_id,version,content,content_hash) values (${proposalId},2,${json(content)},${contentHash(content)})`);
    await t.execute(query`insert into editorial.proposal_targets(proposal_id,proposal_version,entity_id,payload) values (${proposalId},2,${record.id},${json(record)})`);
    await t.execute(query`insert into editorial.approvals(id,proposal_id,proposal_version,submitted_hash,reviewer_id,reason,validator_version) values (${id(811)},${proposalId},2,${contentHash(content)},${id(999)},'Synthetic review','m1')`);
    await insertApprovedRevision(t, { revision_id: revisionId(record.id), approval_id: id(811), payload: record, evidence: [{ path: '/name', source_id: id(999999), note: null }] });
  });
  assert.equal((await tx.execute(query`select count(*)::int n from editorial.entities where id=${record.id}`))[0]!.n, 0);
  assert.equal((await tx.execute(query`select count(*)::int n from editorial.revisions where entity_id=${record.id}`))[0]!.n, 0);
  assert.equal((await tx.execute(query`select count(*)::int n from editorial.revision_references where revision_id=${revisionId(record.id)}`))[0]!.n, 0);
}));
