import { z } from 'zod';

const Id = z.uuid().regex(/^[0-9a-f-]+$/);
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Text = z.string().trim().min(1).max(10_000);
export const ImageSourceUrl = z.url().refine(value => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      && !['boardgamegeek.com', 'geekdo.com', 'geekdo-images.com'].some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}, 'Use an HTTP(S) source outside the prohibited BGG image hosts');
export const ImageUse = z.enum(['noncommercial', 'commercial']);
export const ImageRights = z.strictObject({
  basis: z.enum(['publisher-permission', 'publisher-press-kit', 'cc-by', 'cc-by-sa', 'cc0', 'public-domain', 'fair-use']),
  // A source category is not a permission grant. Review the actual terms/evidence.
  terms_url: ImageSourceUrl,
  attribution: Text.nullable(),
  allowed_uses: z.array(ImageUse).min(1).max(2).refine(values => new Set(values).size === values.length),
  redistribution_allowed: z.boolean(),
  note: Text,
}).refine(rights => !['cc-by', 'cc-by-sa'].includes(rights.basis) || rights.attribution !== null,
  'Attribution is required for CC BY and CC BY-SA');
export const ImageOriginal = z.strictObject({
  sha256: Hash,
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  width: z.int().positive().max(40_000),
  height: z.int().positive().max(40_000),
  bytes: z.int().positive().max(20_000_000),
});
export const ImageRendition = z.strictObject({
  sha256: Hash,
  object_key: z.string().regex(/^covers\/[a-f0-9]{64}\.webp$/),
  media_type: z.literal('image/webp'),
  width: z.int().positive().max(1200),
  height: z.int().positive().max(1200),
  bytes: z.int().positive().max(20_000_000),
}).refine(value => value.object_key === `covers/${value.sha256}.webp`, 'Object key must identify its exact bytes');
export const CoverMetadata = z.strictObject({
  edition_id: Id,
  status: z.enum(['available', 'withdrawn']),
  alt_text: z.string().trim().min(1).max(500),
  source_url: ImageSourceUrl,
  acquired_on: z.iso.date(),
  rights: ImageRights,
  original: ImageOriginal,
  renditions: z.strictObject({ thumbnail: ImageRendition, detail: ImageRendition }),
});
export const ImageDelivery = ImageRendition.safeExtend({ url: z.url().refine(value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}) });
export const CoverImage = z.strictObject({
  asset_id: Id,
  edition_id: Id,
  alt_text: CoverMetadata.shape.alt_text,
  source_url: ImageSourceUrl,
  rights: ImageRights,
  thumbnail: ImageDelivery,
  detail: ImageDelivery,
});
export type ImageUse = z.infer<typeof ImageUse>;
export type CoverImage = z.infer<typeof CoverImage>;

export const CoverSnapshotRecord = z.strictObject({
  game_id: Id,
  edition_id: Id.nullable(),
  cover: CoverImage.nullable(),
  unavailable_reason: z.enum(['missing_edition', 'missing_cover', 'withdrawn', 'use_not_permitted', 'redistribution_not_permitted']).nullable(),
}).superRefine((record, ctx) => {
  if ((record.cover === null) !== (record.unavailable_reason !== null)) ctx.addIssue({ code: 'custom', message: 'An absent cover needs a reason' });
  if (record.cover && record.cover.edition_id !== record.edition_id) ctx.addIssue({ code: 'custom', message: 'Cover must match selected edition' });
});
export const CoverSnapshot = z.strictObject({
  schema_version: z.literal('1.0'),
  release_id: z.string().regex(/^r[0-9]{6,}$/),
  use_context: ImageUse,
  delivery: z.enum(['urls', 'bundled']),
  counts: z.strictObject({ games: z.int().nonnegative(), available: z.int().nonnegative(), missing: z.int().nonnegative() }),
  records: z.array(CoverSnapshotRecord),
}).superRefine((snapshot, ctx) => {
  const available = snapshot.records.filter(record => record.cover !== null).length;
  if (snapshot.counts.games !== snapshot.records.length || snapshot.counts.available !== available || snapshot.counts.missing !== snapshot.records.length - available)
    ctx.addIssue({ code: 'custom', message: 'Cover counts do not match records' });
  if (new Set(snapshot.records.map(record => record.game_id)).size !== snapshot.records.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate game IDs' });
  for (const record of snapshot.records) if (record.cover) {
    if (!record.cover.rights.allowed_uses.includes(snapshot.use_context) || (snapshot.delivery === 'bundled' && !record.cover.rights.redistribution_allowed))
      ctx.addIssue({ code: 'custom', message: 'Cover rights do not allow this delivery context' });
  }
});
export type CoverSnapshot = z.infer<typeof CoverSnapshot>;
