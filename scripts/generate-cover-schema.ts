import { readFile, writeFile } from 'node:fs/promises';
import { CoverSnapshot, z } from '@catalog/contracts';

const path = 'docs/contracts/cover-snapshot.schema.json';
const bytes = `${JSON.stringify(z.toJSONSchema(CoverSnapshot, { target: 'draft-2020-12' }), null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8') !== bytes) throw new Error('Cover schema drift; run npm run covers:schema');
  console.log('Cover snapshot schema matches');
} else await writeFile(path, bytes);
