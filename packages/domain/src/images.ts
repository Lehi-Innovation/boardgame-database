import { CatalogRecord, CoverImage, CoverSnapshot, ImageUse, type ActiveRecord } from '@catalog/contracts';
import { validateCatalog } from './index.ts';

type Asset = Extract<ActiveRecord, { entity_type: 'asset' }>;
export type CoverOptions = {
  release_id: string;
  base_url: string;
  use_context: ImageUse;
  delivery: 'urls' | 'bundled';
  // Operational withdrawals can suppress even a historical pinned release.
  withdrawn_asset_ids: readonly string[];
};
function deliveryBase(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error('Use an HTTP(S) delivery base without credentials, query or fragment');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

/** Pure projection. The caller must obtain records from one frozen, ready release. */
export function buildCoverSnapshot(input: readonly unknown[], options: CoverOptions): CoverSnapshot {
  ImageUse.parse(options.use_context);
  const records = input.map(record => CatalogRecord.parse(record));
  const findings = validateCatalog(records);
  if (findings.length) throw new Error(`Invalid cover catalog: ${findings.map(f => `${f.entity_id} ${f.code}`).join(', ')}`);
  const byId = new Map(records.map(record => [record.id, record]));
  const withdrawn = new Set(options.withdrawn_asset_ids);
  const base = deliveryBase(options.base_url);
  function cover(asset: Asset) {
    const image = (rendition: Asset['renditions']['thumbnail']) => ({ ...rendition, url: new URL(rendition.object_key, base).href });
    return CoverImage.parse({ asset_id: asset.id, edition_id: asset.edition_id, alt_text: asset.alt_text,
      source_url: asset.source_url, rights: asset.rights, thumbnail: image(asset.renditions.thumbnail), detail: image(asset.renditions.detail) });
  }
  const projected = records.filter(record => record.state === 'active' && record.entity_type === 'game').map(game => {
    if (game.state !== 'active' || game.entity_type !== 'game') throw new Error('Expected active game');
    const edition = game.default_edition_id ? byId.get(game.default_edition_id) : null;
    let reason: CoverSnapshot['records'][number]['unavailable_reason'] = 'missing_edition';
    let image: CoverImage | null = null;
    if (edition?.state === 'active' && edition.entity_type === 'edition') {
      const asset = edition.cover_asset_id ? byId.get(edition.cover_asset_id) : null;
      reason = 'missing_cover';
      if (asset?.state === 'active' && asset.entity_type === 'asset') {
        if (asset.status === 'withdrawn' || withdrawn.has(asset.id)) reason = 'withdrawn';
        else if (!asset.rights.allowed_uses.includes(options.use_context)) reason = 'use_not_permitted';
        else if (options.delivery === 'bundled' && !asset.rights.redistribution_allowed) reason = 'redistribution_not_permitted';
        else { image = cover(asset); reason = null; }
      }
    }
    return { game_id: game.id, edition_id: game.default_edition_id, cover: image, unavailable_reason: reason };
  }).sort((a, b) => a.game_id.localeCompare(b.game_id, 'en'));
  const available = projected.filter(row => row.cover !== null).length;
  return CoverSnapshot.parse({ schema_version: '1.0', release_id: options.release_id, use_context: options.use_context, delivery: options.delivery,
    counts: { games: projected.length, available, missing: projected.length - available }, records: projected });
}

export function requireCoverCoverage(snapshot: CoverSnapshot, gameIds: readonly string[]) {
  const ready = new Set(snapshot.records.filter(row => row.cover).map(row => row.game_id));
  const missing = gameIds.filter(id => !ready.has(id));
  if (missing.length) throw new Error(`Required launch covers missing or ineligible (${missing.length}/${gameIds.length}): ${missing.join(', ')}`);
}
