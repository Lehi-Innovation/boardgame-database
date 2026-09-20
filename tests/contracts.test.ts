import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { CatalogRecord, Duration, EditionRecord, GameRecord, LegacyMapping, PlayerSupport, ProposalContent, ReviewProposalCommand, Source, SendContributionCommand } from '@catalog/contracts';
import { contentHash } from '@catalog/domain';
import { catalogFixture, edition, game, id, sourceFixture } from './fixtures/catalog.js';

test('quick contributions accept a name or rough note, preserving optional unstructured text', () => {
  const command = { contribution_id: id(901), content: { kind: 'game', name: '  007\n' } };
  assert.deepEqual(SendContributionCommand.parse(command).content, { kind: 'game', name: '  007\n', body: '', details: [] });
  for (const kind of ['correction', 'problem']) {
    const content = { kind, body: 'Maybe 2?\nNot sure!', details: [{ category: 'links', text: 'some book, p. ?; not a URL' }, { category: 'play', text: 'two-ish, ages ???' }] };
    assert.deepEqual(SendContributionCommand.parse({ ...command, content }).content, { name: '', ...content });
    assert.equal(SendContributionCommand.safeParse({ ...command, content: { kind, body: '   ' } }).success, false);
  }
  assert.equal(SendContributionCommand.safeParse({ ...command, content: { kind: 'game', name: '' } }).success, false);
  assert.equal(SendContributionCommand.safeParse({ ...command, author_id: id(902) }).success, false);
  assert.equal(SendContributionCommand.safeParse({ ...command, content: { ...command.content, state: 'approved' } }).success, false);
});

test('synthetic edge-case catalog satisfies the record contract', () => {
  for (const record of catalogFixture()) assert.deepEqual(CatalogRecord.parse(record), record);
});
test('007 and external identifiers survive JSON and SQLite as strings', () => {
  const record = JSON.parse(JSON.stringify(game(1, { name: '007', identifiers: [{ namespace: 'bgg', value: '0007' }] })));
  const mapping = LegacyMapping.parse({ source: 'legacy_yaml', legacy_id: '007', entity_id: id(1), source_hash: 'a'.repeat(64) });
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec('CREATE TABLE identities (id TEXT PRIMARY KEY, legacy_id TEXT, name TEXT, external_id TEXT) STRICT');
    sqlite.prepare('INSERT INTO identities VALUES (?, ?, ?, ?)').run(record.id, mapping.legacy_id, record.name, record.identifiers[0].value);
    const row = sqlite.prepare('SELECT * FROM identities').get();
    assert.equal(row?.legacy_id, '007');
    assert.equal(row?.name, '007');
    assert.equal(row?.external_id, '0007');
  } finally { sqlite.close(); }
  assert.equal(LegacyMapping.safeParse({ ...mapping, legacy_id: 7 }).success, false);
  assert.equal(GameRecord.safeParse({ ...record, id: 7 }).success, false);
  assert.equal(GameRecord.safeParse({ ...record, id: 'ABCDEFAB-1234-4000-8000-ABCDEF123456' }).success, false);
});
test('unknowns are explicit; personal data and misspelled fields are rejected', () => {
  const unknown = game(1);
  assert.equal(unknown.first_published_year, null);
  assert.deepEqual(unknown.designers, []);
  for (const extra of [{ affinity: 5 }, { hotness: 2 }, { plays: [] }, { designer: [] }]) assert.equal(GameRecord.safeParse({ ...unknown, ...extra }).success, false);
  const { first_published_year: _, ...missing } = unknown;
  assert.equal(GameRecord.safeParse(missing).success, false);
  assert.equal(GameRecord.safeParse({ ...unknown, first_published_year: 0 }).success, false);
});
test('player support and duration do not invent precision', () => {
  for (const counts of [[0], [2, 2], [4, 2], ['12+'], []]) assert.equal(PlayerSupport.safeParse({ kind: 'exact', counts }).success, false);
  assert.deepEqual(PlayerSupport.parse({ kind: 'at_least', min: 12 }), { kind: 'at_least', min: 12 });
  assert.equal(Duration.safeParse({ min: 45, max: 20 }).success, false);
  assert.equal(Duration.safeParse({ min: null, max: null }).success, false);
  assert.deepEqual(Duration.parse({ min: null, max: 45 }), { min: null, max: 45 });
});
test('an edition has at most one specification for each play context', () => {
  const record = edition(101, 1);
  assert.equal(EditionRecord.safeParse({ ...record, play_specifications: [...record.play_specifications, ...record.play_specifications] }).success, false);
});
test('submissions reject mismatched identities, duplicate targets, and workflow injection', () => {
  const target = { entity_id: id(1), base_revision_id: null, payload: game(1), evidence: [] };
  const content = { title: 'New game', rationale: 'Synthetic example', origin: 'human', targets: [target], sources: [] };
  assert.equal(ProposalContent.safeParse(content).success, true);
  for (const change of [{ targets: [target, target] }, { state: 'approved' }, { targets: [{ ...target, entity_id: id(2) }] }]) assert.equal(ProposalContent.safeParse({ ...content, ...change }).success, false);
  assert.equal(ReviewProposalCommand.safeParse({ proposal_id: id(1), expected_version: 1, submitted_hash: 'a'.repeat(64), decision: 'approve', reason: 'Reviewed', idempotency_key: id(2), reviewer_id: id(3) }).success, false);
});
test('hashes bind exact content but ignore object-key ordering', () => {
  assert.equal(contentHash({ name: '007', year: null }), contentHash({ year: null, name: '007' }));
  assert.notEqual(contentHash({ name: '007' }), contentHash({ name: '7' }));
  assert.notEqual(contentHash([1, 2]), contentHash([2, 1]));
});
test('source policy blocks restricted research without blocking retained external IDs', () => {
  for (const url of ['not a URL', '', 'https://boardgamegeek.com/thing/7', 'https://www.boardgamegeek.com/7', 'https://BOARDGAMEGEEK.com./7', 'file:///tmp/data']) assert.equal(Source.safeParse({ ...sourceFixture, url }).success, false);
  assert.equal(Source.safeParse(sourceFixture).success, true);
});
