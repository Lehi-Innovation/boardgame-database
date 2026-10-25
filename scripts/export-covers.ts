import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { connectDatabase, readPublishedRecords } from '@catalog/database';
import { Id, ImageUse, z } from '@catalog/contracts';
import { buildCoverSnapshot, requireCoverCoverage } from '../packages/domain/src/images.ts';
import { coverBundleFiles, writeCoverBundle } from './lib/cover-images.ts';

const { values } = parseArgs({ options: {
  release: { type: 'string' }, 'base-url': { type: 'string' }, use: { type: 'string' },
  objects: { type: 'string', default: '.local/cover-staging/objects' },
  out: { type: 'string', default: '.local/cover-snapshots' },
  bundle: { type: 'boolean', default: false }, 'require-pilot': { type: 'boolean', default: false },
  withdrawals: { type: 'string', default: 'images/withdrawals.json' },
} });
if (!values.release || !/^r[0-9]{6,}$/.test(values.release) || !values['base-url'] || !values.use)
  throw new Error('Usage: npm run export:covers -- --release r000001 --base-url https://assets.example/ --use commercial [--bundle] [--require-pilot]');
if (!process.env.CATALOG_DATABASE_URL) throw new Error('Set CATALOG_DATABASE_URL to a catalog_reader connection');
const withdrawals = z.array(Id).parse(JSON.parse(await readFile(values.withdrawals, 'utf8')));
const connection = connectDatabase(process.env.CATALOG_DATABASE_URL);
try {
  const snapshot = buildCoverSnapshot(await readPublishedRecords(connection.db, values.release), {
    release_id: values.release, base_url: values['base-url'], use_context: ImageUse.parse(values.use),
    delivery: values.bundle ? 'bundled' : 'urls', withdrawn_asset_ids: withdrawals,
  });
  if (values['require-pilot']) {
    const pilot = z.object({ entries: z.array(z.object({ game_id: Id })) }).parse(JSON.parse(await readFile('imports/boardgame-marketplace/manifest.json', 'utf8')));
    requireCoverCoverage(snapshot, pilot.entries.map(entry => entry.game_id));
  }
  const files = await coverBundleFiles(snapshot, resolve(values.objects));
  const directory = await writeCoverBundle(resolve(values.out), files);
  console.log(JSON.stringify({ directory, release_id: snapshot.release_id, ...snapshot.counts }, null, 2));
} finally { await connection.close(); }
