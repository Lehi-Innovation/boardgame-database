import { AssetRecord, type CatalogRecord } from '@catalog/contracts';
import { edition, game, id } from './catalog.ts';

export const coverInput = {
  id: id(200), edition_id: id(101), alt_text: 'Front cover of the synthetic English edition',
  source_url: 'https://publisher.example/press/synthetic', acquired_on: '2026-09-20',
  rights: { basis: 'publisher-permission' as const, terms_url: 'https://publisher.example/press/terms',
    attribution: 'Synthetic Publisher', allowed_uses: ['commercial', 'noncommercial'] as ('commercial' | 'noncommercial')[],
    redistribution_allowed: true, note: 'Synthetic permission for automated tests; no real artwork.' },
};
export function assetFixture() {
  const rendition = (hash: string, width: number, height: number) => ({ sha256: hash.repeat(64), object_key: `covers/${hash.repeat(64)}.webp`, media_type: 'image/webp', width, height, bytes: 500 });
  return AssetRecord.parse({ ...coverInput, schema_version: 1, state: 'active', entity_type: 'asset', status: 'available', field_notes: [],
    original: { sha256: 'c'.repeat(64), media_type: 'image/png', width: 600, height: 900, bytes: 1000 },
    renditions: { thumbnail: rendition('a', 213, 320), detail: rendition('b', 600, 900) },
  });
}
export function imageCatalog(asset = assetFixture()): CatalogRecord[] {
  return [game(1, { default_edition_id: id(101) }), edition(101, 1, { cover_asset_id: asset.id }), asset];
}
export const coverOptions = {
  release_id: 'r000001', base_url: 'https://assets.example/catalog/', use_context: 'commercial' as const,
  delivery: 'bundled' as const, withdrawn_asset_ids: [] as string[],
};
