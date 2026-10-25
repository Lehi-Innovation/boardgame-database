import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { prepareCover, readCoverFile, writePreparedCover } from './lib/cover-images.ts';

const { values } = parseArgs({ options: {
  file: { type: 'string' }, metadata: { type: 'string' }, out: { type: 'string', default: '.local/cover-staging' },
} });
if (!values.file || !values.metadata) throw new Error('Usage: npm run prepare:cover -- --file cover.png --metadata metadata.json [--out DIRECTORY]');
const input: unknown = JSON.parse(await readFile(values.metadata, 'utf8'));
const prepared = await prepareCover(await readCoverFile(values.file), input);
const candidate = await writePreparedCover(resolve(values.out), prepared);
console.log(JSON.stringify({ candidate, status: 'unreviewed', asset_id: prepared.asset.id, edition_id: prepared.asset.edition_id, renditions: prepared.asset.renditions }, null, 2));
