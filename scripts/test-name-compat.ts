import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { sha256 } from './lib/name-snapshot.ts';

const exec = promisify(execFile);
const fixture = resolve('tests/fixtures/name-snapshot');
const schema = resolve('docs/contracts/name-snapshot.schema.json');
const python = process.env.PYTHON ?? 'python3';
const ruby = process.env.RUBY ?? 'ruby';
const readers = [
  [python, resolve('examples/name-snapshot/python/read_snapshot.py')],
  [ruby, resolve('examples/name-snapshot/ruby/read_snapshot.rb')],
] as const;
const expected = JSON.parse(await readFile(join(fixture, 'snapshot.json'), 'utf8'));
const temporary = await mkdtemp(join(tmpdir(), 'name-compat-'));
try {
  for (const [binary, reader] of readers) {
    const { stdout } = await exec(binary, [reader, join(fixture, 'snapshot.json'), join(fixture, 'snapshot.sha256'), schema]);
    const result = JSON.parse(stdout);
    assert.deepEqual(result.snapshot, expected);
    assert.equal(result.checksum, sha256(await readFile(join(fixture, 'snapshot.json'))));
    for (const variant of ['major', 'counts', 'duplicate', 'numeric', 'checksum', 'additive', 'unicode_filename']) {
      const copy = structuredClone(expected);
      if (variant === 'major') copy.schema_version = '2.0';
      if (variant === 'counts') copy.counts.records++;
      if (variant === 'duplicate') copy.records[1] = copy.records[0];
      if (variant === 'numeric') copy.records[0].source_id = 7;
      if (variant === 'additive') { copy.schema_version = '1.1'; copy.optional_future_field = { ignored: true }; }
      if (variant === 'unicode_filename') { copy.records[0].source_id = 'legacy_yaml:mets%C3%A4mies'; copy.records[0].source_file = 'games/metsämies.yaml'; }
      const raw = JSON.stringify(copy);
      await writeFile(join(temporary, 'snapshot.json'), raw);
      await writeFile(join(temporary, 'snapshot.sha256'), `${variant === 'checksum' ? '0'.repeat(64) : sha256(raw)}  snapshot.json\n`);
      const command = exec(binary, [reader, join(temporary, 'snapshot.json'), join(temporary, 'snapshot.sha256'), schema]);
      if (['additive', 'unicode_filename'].includes(variant)) await command;
      else await assert.rejects(command, `${binary} must reject ${variant}`);
    }
    console.log(`${binary}: shared bytes, Unicode, strings, aliases, nulls, checksum and rejection checks passed`);
  }
  const { stdout } = await exec(python, [resolve('examples/name-snapshot/python/test_import.py'), fixture, schema]);
  console.log(stdout.trim());
} finally { await rm(temporary, { recursive: true, force: true }); }
