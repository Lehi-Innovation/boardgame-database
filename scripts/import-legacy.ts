import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { CatalogRecord, z } from '@catalog/contracts';
import { compileEntry, editorialClient, ImportManifest, importProposal, readLegacy } from './lib/legacy-import.ts';

const usage = `Usage: npm run import:legacy -- plan|save|submit [options]
  --manifest PATH  Identity map (default: imports/boardgame-marketplace/manifest.json)
  --games PATH     Legacy YAML directory (default: games)
  --only SLUG      Select one mapped filename slug (required for save/submit)
  --context PATH   Approved record JSON array for offline planning
  --output PATH    Write a new JSON report file (fails if the file already exists)
  --origin URL     Local editorial application (default: http://127.0.0.1:3100)

plan is offline and read-only. save/submit use CATALOG_IMPORT_TOKEN, a signed-in
user access token, through the existing editorial HTTP commands. No database
credentials, approval, publication, source fetching, or marketplace writes.`;

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    manifest: { type: 'string', default: 'imports/boardgame-marketplace/manifest.json' },
    games: { type: 'string', default: 'games' }, only: { type: 'string' }, context: { type: 'string' },
    output: { type: 'string' }, origin: { type: 'string', default: 'http://127.0.0.1:3100' }, help: { type: 'boolean' },
  } });
  if (values.help) { console.log(usage); return; }
  const [mode] = positionals;
  if (positionals.length !== 1 || !['plan', 'save', 'submit'].includes(mode!)) throw new Error(usage);
  if (mode !== 'plan' && !values.only) throw new Error('Select one prepared entry with --only SLUG.');
  if (mode !== 'plan' && values.context) throw new Error('save/submit always read current approved records from the server.');
  const manifest = ImportManifest.parse(JSON.parse(await readFile(values.manifest, 'utf8')));
  const entries = manifest.entries.filter(entry => !values.only || entry.legacy_id === values.only);
  if (!entries.length) throw new Error('No manifest entry matches --only.');
  const client = mode === 'plan' ? null : editorialClient(values.origin, process.env.CATALOG_IMPORT_TOKEN ?? '');
  const heads = client ? await client.records() : [];
  const approved = z.array(CatalogRecord).parse(values.context ? JSON.parse(await readFile(values.context, 'utf8')) : heads.map(head => head.payload));
  const plans = await Promise.all(entries.map(async entry => compileEntry(manifest, entry, await readLegacy(values.games, entry.legacy_id), approved)));
  const results = [];
  if (client) for (let index = 0; index < entries.length; index++) results.push(await importProposal(entries[index]!, plans[index]!, client, mode === 'submit'));
  const report = { format_version: 1, dataset: manifest.dataset, legacy_commit: manifest.legacy_commit, consumer: manifest.consumer,
    mode, approved_context_records: approved.length, entries: plans, results };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (values.output) {
    await writeFile(values.output, json, { flag: 'wx', mode: 0o600 });
    console.log(`Wrote ${plans.length} candidate reports to ${values.output}. ${plans.filter(plan => plan.blockers.length).length} need preparation.`);
  } else console.log(json);
}

main().catch(error => {
  // Network errors may contain private URLs/headers in their causes. Never dump them.
  console.error(error instanceof z.ZodError ? 'Manifest or context failed schema validation. Check the importer guide.'
    : error instanceof TypeError ? 'Importer request or input failed; check the local server and inputs.' : (error as Error).message);
  process.exitCode = 1;
});
