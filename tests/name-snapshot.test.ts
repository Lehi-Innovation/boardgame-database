import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileNameSnapshot, jsonBytes, readNameInputs, writeNameBundle } from '../scripts/lib/name-snapshot.ts';
import { validateNameSnapshot } from '../packages/contracts/src/name-snapshot.ts';

const fixture = 'tests/fixtures/name-snapshot';
const commit = '0'.repeat(40);
const compile = async () => compileNameSnapshot(await readNameInputs(`${fixture}/source`), commit);

test('name export preserves lexical strings, Unicode, nulls and separate identities; reports unsafe aliases/collisions', async () => {
  const result = await compile();
  assert.equal(result.bytes, await readFile(`${fixture}/snapshot.json`, 'utf8'));
  assert.equal(jsonBytes(result.report), await readFile(`${fixture}/report.json`, 'utf8'));
  assert.equal(`${result.checksum}  snapshot.json\n`, await readFile(`${fixture}/snapshot.sha256`, 'utf8'));
  const numeric = result.snapshot.records.find(r => r.source_id === 'legacy_yaml:007')!;
  assert.equal(numeric.title, '007');
  assert.deepEqual(numeric.aliases, ['Double Seven']);
  assert.equal(numeric.disambiguation, null);
  assert.equal(result.report.omissions.length, 3);
  assert.equal(result.snapshot.counts.deferred_records, 2);
  assert.equal(result.snapshot.records.filter(r => r.title === 'Synthetic Twin').length, 2);
  assert.ok(!result.bytes.includes('secret-should-never-export'));
});

test('snapshot bytes/version are independent of input order and change with source bytes, even deferred rows', async () => {
  const inputs = await readNameInputs(`${fixture}/source`);
  const first = compileNameSnapshot(inputs, commit);
  assert.equal(first.bytes, compileNameSnapshot([...inputs].reverse(), commit).bytes);
  const changed = inputs.map(input => input.filename === 'ambiguous-a.yaml' ? { ...input, bytes: Buffer.concat([input.bytes, Buffer.from('\n# changed\n')]) } : input);
  const second = compileNameSnapshot(changed, commit);
  assert.notEqual(first.checksum, second.checksum);
  assert.notEqual(first.snapshot.dataset_version, second.snapshot.dataset_version);
});

test('unsafe YAML, invalid names, duplicate identities and invalid UTF-8 fail before writing', () => {
  for (const text of ['name: A\nname: B', 'name: [A]', 'name: !!int 7', 'name: &a A\nalternate_names: [*a]', 'name: ""']) {
    assert.throws(() => compileNameSnapshot([{ filename: 'a.yaml', bytes: Buffer.from(text) }], commit));
  }
  assert.throws(() => compileNameSnapshot([{ filename: 'a.yaml', bytes: new Uint8Array([0xff]) }], commit));
  const input = { filename: 'a.yaml', bytes: Buffer.from('name: A') };
  assert.throws(() => compileNameSnapshot([input, input], commit));
});

test('Unicode filenames use reversible percent-encoded opaque source IDs', () => {
  const result = compileNameSnapshot([{ filename: 'metsämies.yaml', bytes: Buffer.from('name: Metsämies') }], commit);
  assert.equal(result.snapshot.records[0]!.source_id, 'legacy_yaml:mets%C3%A4mies');
});

test('atomic bundles are repeatable; a failed/conflicting write preserves the prior artifact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'catalog-names-'));
  try {
    const result = await compile();
    const path = await writeNameBundle(directory, result);
    assert.equal(await writeNameBundle(directory, result), path);
    await writeFile(join(path, 'report.json'), 'intentionally different');
    await assert.rejects(writeNameBundle(directory, result), /refusing to overwrite/);
    assert.equal(await readFile(join(path, 'snapshot.json'), 'utf8'), result.bytes);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('contract rejects wrong counts/IDs/major versions and accepts additive fields', async () => {
  const { snapshot } = await compile();
  assert.throws(() => validateNameSnapshot({ ...snapshot, schema_version: '2.0' }));
  assert.throws(() => validateNameSnapshot({ ...snapshot, records: [...snapshot.records, snapshot.records[0]] }));
  assert.throws(() => validateNameSnapshot({ ...snapshot, counts: { ...snapshot.counts, aliases: 99 } }));
  assert.equal(validateNameSnapshot({ ...snapshot, schema_version: '1.1', future: true }).future, true);
});
