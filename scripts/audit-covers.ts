import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from '@catalog/contracts';

// Inventory only: a filename match or a filled license label never establishes approval.
const images = (await readdir('images')).filter(name => /\.(jpg|jpeg|png|webp)$/i.test(name));
const sources = parse(await readFile('images/sources.yaml', 'utf8')) as Record<string, Record<string, unknown>>;
const pilot = z.object({ entries: z.array(z.object({ legacy_id: z.string(), game_id: z.string(), edition_id: z.string().nullable(), candidate: z.object({ name: z.string() }) })) })
  .parse(JSON.parse(await readFile('imports/boardgame-marketplace/manifest.json', 'utf8')));
const candidates = await Promise.all(pilot.entries.map(async entry => {
  const game = parse(await readFile(`games/${entry.legacy_id}.yaml`, 'utf8')) as { name: string; year: number | null };
  const file = images.find(file => file.slice(0, file.lastIndexOf('.')).toLowerCase() === `${game.name} (${game.year})`.toLowerCase()) ?? null;
  const provenance = Object.values(sources).find(source => source.file === file);
  return { game_id: entry.game_id, title: entry.candidate.name, legacy_id: entry.legacy_id, edition_id: entry.edition_id, legacy_image: file,
    complete_legacy_provenance: !!(provenance?.source_url && provenance?.license && provenance?.date),
    next_action: entry.edition_id === null ? 'Resolve publication/edition identity, then source and review its cover' : 'Source and review cover with downstream usage terms' };
}));
console.log(JSON.stringify({ scope: 'marketplace-seed-candidates', required_coverage: '100% approved, edition-matched covers for image-enabled launch',
  counts: { candidates: candidates.length, legacy_files: candidates.filter(c => c.legacy_image).length,
    complete_legacy_provenance: candidates.filter(c => c.complete_legacy_provenance).length,
    unresolved_editions: candidates.filter(c => c.edition_id === null).length }, candidates }, null, 2));
