import { AssetRecord, EditionRecord, Id, ProposalContent, Source, z } from '@catalog/contracts';

export const CoverProposalContext = z.strictObject({
  edition_revision_id: Id,
  edition: EditionRecord,
  image_source: Source,
  permission_source: Source,
  rationale: z.string().trim().min(1).max(10_000),
});

/** Prepare the asset and edition change together; normal authenticated commands review them. */
export function prepareCoverProposal(assetInput: unknown, contextInput: unknown) {
  const asset = AssetRecord.parse(assetInput);
  const context = CoverProposalContext.parse(contextInput);
  if (asset.edition_id !== context.edition.id) throw new Error('Asset must match the edition under review');
  if (context.image_source.url !== asset.source_url || context.permission_source.url !== asset.rights.terms_url)
    throw new Error('Citations must match the image source and usage terms');
  if (context.image_source.id === context.permission_source.id && JSON.stringify(context.image_source) !== JSON.stringify(context.permission_source))
    throw new Error('Distinct citations need distinct source IDs');
  const sources = [...new Map([context.image_source, context.permission_source].map(source => [source.id, source])).values()];
  return ProposalContent.parse({
    title: `Cover for ${context.edition.name}`, rationale: context.rationale, origin: 'import', sources,
    targets: [
      { entity_id: asset.id, base_revision_id: null, payload: asset,
        evidence: ['edition_id', 'status', 'alt_text', 'source_url', 'acquired_on', 'rights'].map(field => ({
          path: `/${field}`, source_id: field === 'rights' ? context.permission_source.id : context.image_source.id,
          note: field === 'rights' ? asset.rights.note : 'Verify this cover against the selected edition and source.',
        })) },
      { entity_id: context.edition.id, base_revision_id: context.edition_revision_id,
        payload: { ...context.edition, cover_asset_id: asset.id },
        evidence: [{ path: '/cover_asset_id', source_id: context.image_source.id, note: 'Selected front cover for this edition.' }] },
    ],
  });
}
