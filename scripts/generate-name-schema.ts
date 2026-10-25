import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { NameSnapshot } from '../packages/contracts/src/name-snapshot.ts';
import { jsonBytes } from './lib/name-snapshot.ts';

const path = 'docs/contracts/name-snapshot.schema.json';
const bytes = jsonBytes(z.toJSONSchema(NameSnapshot, { target: 'draft-2020-12' }));
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8') !== bytes) throw new Error('Name schema drift; run npm run names:schema');
  console.log('Name snapshot schema matches');
} else await writeFile(path, bytes);
