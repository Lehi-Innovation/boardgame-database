import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CatalogRecord } from '@catalog/contracts';
import { CommandError, contentHash } from '@catalog/domain';
import { compileEntry, editorialClient, ImportManifest, importProposal, inspectLegacy, readLegacy, sourceHash,
  type Content, type ImportCommands, type ProposalDetail } from '../scripts/lib/legacy-import.ts';
import { game, id, sourceFixture } from './fixtures/catalog.ts';

const bytes = Buffer.from('id: 007\nname: 007\nbgg_id: 9007199254740993123\npossible_counts: [2, 4]\naffinity: secret\n');
export function importFixture() {
  return ImportManifest.parse({ format_version: 1, dataset: 'synthetic', legacy_commit: 'a'.repeat(40),
    consumer: { name: 'Synthetic', commit: 'b'.repeat(40), path: 'seeds', source_hash: sourceHash('seeds') },
    entries: [{ legacy_id: '007', source_hash: sourceHash(bytes), candidate: { name: '007', identifiers: [{ namespace: 'bgg', value: '0007' }] },
      game_id: id(771), edition_id: null, proposal_id: randomUUID(), identity: { status: 'prepared', rationale: 'Synthetic identity preparation, not approval.' },
      prepared: { expected_version: 0, expected_content_hash: null, content: {
        title: 'Synthetic import', rationale: 'Synthetic rulebook supports the name.', origin: 'import', sources: [sourceFixture],
        targets: [{ entity_id: id(771), base_revision_id: null, payload: game(771, { name: '007' }), evidence: [{ path: '/name', source_id: sourceFixture.id, note: null }] }],
      } },
    }],
  });
}
function memoryCommands() {
  let current: ProposalDetail | null = null;
  let saves = 0, submissions = 0, loseSave = false, loseSubmit = false;
  const commands: ImportCommands = {
    detail: async () => current && structuredClone(current),
    save: async input => {
      if (input.expected_version !== (current?.version ?? 0)) throw new CommandError(409, 'conflict', 'Version conflict');
      current = { id: input.proposal_id, own: true, state: 'draft', version: (current?.version ?? 0) + 1, draft: structuredClone(input.content) };
      saves++;
      if (loseSave) { loseSave = false; throw new Error('Lost save response'); }
    },
    submit: async input => {
      if (current?.version !== input.expected_version || current.state !== 'draft') throw new Error('Version/state conflict');
      current.state = 'submitted'; submissions++;
      if (loseSubmit) { loseSubmit = false; throw new Error('Lost submit response'); }
    },
  };
  return { commands, get current() { return current!; }, get saves() { return saves; }, get submissions() { return submissions; },
    loseResponses() { loseSave = true; loseSubmit = true; } };
}

test('legacy parsing preserves lexical IDs, reports candidate fields, and excludes personal values', () => {
  const report = inspectLegacy(bytes);
  assert.equal(report.identity_clues.id, '007');
  assert.equal(report.identity_clues.name, '007');
  assert.equal(report.identity_clues.bgg_id, '9007199254740993123');
  assert.deepEqual(report.unverified_facts.possible_counts, ['2', '4']);
  assert.ok(!JSON.stringify(report).includes('secret'));
  for (const yaml of ['id: a\nid: b', 'a: &a [1]\nb: *a', '---\nid: a\n---\nid: b', 'name: !custom 007']) assert.throws(() => inspectLegacy(Buffer.from(yaml)));
  assert.throws(() => inspectLegacy(Buffer.alloc(1_000_001)));
});

test('source pins and pending mapping prevent import; no legacy facts become assertions', () => {
  const manifest = importFixture(), entry = manifest.entries[0]!;
  let plan = compileEntry(manifest, entry, bytes);
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.validation?.errors.length, 0);
  assert.equal(plan.content?.origin, 'import');
  assert.equal(plan.content?.targets[0]!.payload.id, id(771));
  assert.match(plan.content!.rationale, /Legacy import provenance/);
  assert.deepEqual(plan, compileEntry(manifest, entry, bytes));
  assert.ok(compileEntry(manifest, entry, Buffer.concat([bytes, Buffer.from('\n')])).blockers.length);
  entry.identity.status = 'pending'; entry.prepared = null;
  plan = compileEntry(manifest, entry, bytes);
  assert.equal(plan.content, null);
  assert.equal(plan.blockers.length, 2);
});

test('prepared proposals enforce mapped IDs and preserve exact counts, unknown years, and explicit duration bounds', () => {
  const manifest = importFixture(), entry = manifest.entries[0]!;
  entry.edition_id = id(772);
  const content = entry.prepared!.content;
  content.targets[0]!.payload = game(771, { name: '007', default_edition_id: id(772) });
  content.targets.push({ entity_id: id(772), base_revision_id: null,
    payload: CatalogRecord.parse({ schema_version: 1, id: id(772), state: 'active', entity_type: 'edition', field_notes: [],
      name: 'Synthetic printing', game_id: id(771), aliases: [], publication_year: null, languages: [], publishers: [], artists: [],
      identifiers: [], compatible_with: [], play_specifications: [{ context: { kind: 'standalone' }, player_support: { kind: 'exact', counts: [2, 4] }, playtime_minutes: { min: null, max: 40 }, min_age: null }] }),
    evidence: ['/name', '/game_id', '/play_specifications'].map(path => ({ path, source_id: sourceFixture.id, note: null })),
  });
  const plan = compileEntry(manifest, entry, bytes);
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.validation?.errors.length, 0);
  assert.deepEqual(plan.content!.targets[1]!.payload, content.targets[1]!.payload);
  entry.game_id = id(999);
  assert.ok(compileEntry(manifest, entry, bytes).blockers.length);
  assert.throws(() => ImportManifest.parse({ ...manifest, entries: [entry, entry] }));
  assert.throws(() => ImportManifest.parse({ ...manifest, entries: [{ ...entry, legacy_id: '../007' }] }));
});

test('import resumes lost save/submit responses and concurrent retries without extra versions', async () => {
  const manifest = importFixture(), entry = manifest.entries[0]!, mem = memoryCommands();
  const plan = compileEntry(manifest, entry, bytes);
  mem.loseResponses();
  const [first, retry] = await Promise.all([importProposal(entry, plan, mem.commands, true), importProposal(entry, plan, mem.commands, true)]);
  assert.equal(first.version, 1); assert.equal(retry.version, 1);
  assert.equal(mem.saves, 1); assert.equal(mem.submissions, 1);
  assert.equal((await importProposal(entry, plan, mem.commands, true)).state, 'submitted');
  mem.current.state = 'approved';
  assert.equal((await importProposal(entry, plan, mem.commands, true)).state, 'approved');
  assert.equal(mem.saves, 1);
});

test('changed source creates a version only against an explicit baseline, preserving stable entity IDs', async () => {
  const manifest = importFixture(), entry = manifest.entries[0]!, mem = memoryCommands();
  const old = compileEntry(manifest, entry, bytes);
  await importProposal(entry, old, mem.commands, true);
  const changed = Buffer.concat([bytes, Buffer.from('# researched again\n')]);
  entry.source_hash = sourceHash(changed);
  const next = compileEntry(manifest, entry, changed);
  await assert.rejects(importProposal(entry, next, mem.commands), /reviewed version\/hash/);
  entry.prepared!.expected_version = 1;
  entry.prepared!.expected_content_hash = old.content_hash;
  const result = await importProposal(entry, next, mem.commands, true);
  assert.equal(result.version, 2);
  assert.equal(mem.current.draft.targets[0]!.entity_id, id(771));
  assert.equal(mem.saves, 2); assert.equal(mem.submissions, 2);
  // A manual edit invalidates the prepared baseline and must survive retries.
  mem.current.draft.title = 'Manual maintainer edit';
  await assert.rejects(importProposal(entry, next, mem.commands), /reviewed version\/hash/);
  assert.equal(mem.current.draft.title, 'Manual maintainer edit');
  mem.current.state = 'approved';
  await assert.rejects(importProposal(entry, next, mem.commands), /terminal/);
});

test('ownership, review decisions, missing evidence, and unresolved references cannot be bypassed', async () => {
  const manifest = importFixture(), entry = manifest.entries[0]!, mem = memoryCommands();
  const plan = compileEntry(manifest, entry, bytes);
  await importProposal(entry, plan, mem.commands);
  mem.current.own = false;
  await assert.rejects(importProposal(entry, plan, mem.commands), /original proposal author/);
  mem.current.own = true; mem.current.state = 'changes_requested';
  await assert.rejects(importProposal(entry, plan, mem.commands, true), /review decision/);
  entry.prepared!.content.targets[0]!.evidence = [];
  const unsupported = compileEntry(manifest, entry, bytes);
  assert.ok(unsupported.validation?.errors.some(error => error.code === 'evidence_required'));
  await assert.rejects(importProposal(entry, unsupported, mem.commands, true), /unresolved/);
  entry.prepared!.content.targets[0]!.payload = game(771, { designers: [id(404)] });
  assert.ok(compileEntry(manifest, entry, bytes).validation!.errors.length > 0);
});

test('HTTP transport limits credentials to a loopback origin and exposes only save/submit', async () => {
  for (const origin of ['https://catalog.example', 'http://127.0.0.1@evil.example', 'http://user:pass@localhost', 'http://localhost/path', 'file:///tmp/import']) assert.throws(() => editorialClient(origin, 'token'));
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const client = editorialClient('http://127.0.0.1:3100', 'test-token', async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: [] }), { headers: { 'Content-Type': 'application/json' } });
  });
  await client.records();
  assert.equal(calls[0]!.init!.redirect, 'error');
  assert.equal((calls[0]!.init!.headers as Record<string, string>).Authorization, 'Bearer test-token');
  assert.equal('review' in client, false);
  const noAccess = editorialClient('http://localhost:3100', 'token', async () => new Response('{}', { status: 403 }));
  await assert.rejects(noAccess.detail(id(771)), (error: unknown) => error instanceof CommandError && error.status === 403);
});

test('source paths cannot escape through symlinks and the checked-in twenty candidates reproduce offline', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-import-'));
  try {
    await writeFile(join(dir, '007.yaml'), bytes);
    assert.deepEqual(await readLegacy(dir, '007'), bytes);
    await symlink('/etc/passwd', join(dir, 'escape.yaml'));
    await assert.rejects(readLegacy(dir, 'escape'), /inside/);
  } finally { await rm(dir, { recursive: true, force: true }); }
  const manifest = ImportManifest.parse(JSON.parse(await readFile('imports/boardgame-marketplace/manifest.json', 'utf8')));
  assert.equal(manifest.entries.length, 20);
  for (const entry of manifest.entries) {
    const plan = compileEntry(manifest, entry, await readLegacy('games', entry.legacy_id));
    assert.equal(plan.source_hash, entry.source_hash);
    assert.equal(plan.content, null);
    assert.equal(entry.identity.status, 'pending');
    assert.deepEqual(plan.candidate.identifiers, entry.candidate.identifiers);
    assert.equal(plan.blockers.length, 2, entry.legacy_id);
  }
});
