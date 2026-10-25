import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { compileNameSnapshot, readNameInputs, writeNameBundle } from './lib/name-snapshot.ts';

const { values } = parseArgs({ options: { out: { type: 'string', default: '.local/name-snapshots' } } });
const { stdout } = await promisify(execFile)('git', ['rev-parse', 'HEAD']);
const commit = stdout.trim();
const compiled = compileNameSnapshot(await readNameInputs(resolve('games')), commit);
const directory = await writeNameBundle(resolve(values.out), compiled);
console.log(JSON.stringify({ directory, checksum: compiled.checksum, ...compiled.snapshot.counts }, null, 2));
