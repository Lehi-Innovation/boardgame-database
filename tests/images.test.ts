import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { AssetRecord, CatalogRecord, CoverSnapshot, GameSummary, ImageRights, ImageSourceUrl, ProposalContent } from '@catalog/contracts';
import { checkSubmission, contentHash, referencesOf, validateCatalog } from '@catalog/domain';
import { buildCoverSnapshot, requireCoverCoverage } from '../packages/domain/src/images.ts';
import { coverBundleFiles, hashBytes, prepareCover, writeCoverBundle, writePreparedCover } from '../scripts/lib/cover-images.ts';
import { prepareCoverProposal } from '../scripts/lib/cover-proposal.ts';
import { edition, game, id, sourceFixture } from './fixtures/catalog.ts';
import { assetFixture, coverInput, imageCatalog, coverOptions } from './fixtures/images.ts';

const picture = (width = 600, height = 900) => sharp({ create: { width, height, channels: 3, background: '#226688' } }).png().toBuffer();

test('image extension preserves historical payload bytes and allows games without covers', () => {
  const old = edition(101, 1);
  assert.equal(contentHash(CatalogRecord.parse(old)), contentHash(old));
  assert.equal(Object.hasOwn(CatalogRecord.parse(old), 'cover_asset_id'), false);
  assert.deepEqual(validateCatalog([game(1), old]), []);
  const snapshot = buildCoverSnapshot([game(1), old], coverOptions);
  assert.equal(snapshot.records[0]!.unavailable_reason, 'missing_edition');
  assert.throws(() => requireCoverCoverage(snapshot, [id(1)]), /Required launch covers/);
});

test('cover references are typed, edition-specific and stable through title/year changes', () => {
  const records = imageCatalog();
  assert.deepEqual(validateCatalog(records), []);
  assert.ok(referencesOf(records[1]!).some(ref => ref.target_type === 'asset' && ref.relation === 'cover'));
  const before = buildCoverSnapshot(records, coverOptions);
  const summary = { id: id(1), revision_id: id(500), name: 'Example', kind: 'base_game', first_published_year: null,
    designers: [], mechanics: [], themes: [], default_edition: null, cover: before.records[0]!.cover };
  assert.equal(GameSummary.safeParse(summary).success, false);
  assert.equal(GameSummary.safeParse({ ...summary, default_edition: { id: id(101), name: 'English edition', publication_year: null,
    player_support: null, playtime_minutes: null, min_age: null } }).success, true);
  const renamed = records.map(record => record.entity_type === 'game' ? { ...record, name: 'A renamed game', first_published_year: 2025 }
    : record.entity_type === 'edition' ? { ...record, name: 'Corrected edition name', publication_year: 2025 } : record);
  assert.deepEqual(buildCoverSnapshot(renamed, coverOptions), before);
  const other = edition(102, 1, { cover_asset_id: id(200) });
  assert.ok(validateCatalog([...records, other]).some(f => f.code === 'cover_edition'));
  assert.ok(validateCatalog(records.slice(0, 2)).some(f => f.code === 'missing_reference'));
  assert.throws(() => buildCoverSnapshot([...records, other], coverOptions), /cover_edition/);
  assert.throws(() => requireCoverCoverage(before, [id(1), id(2)]), /1\/2/);
  requireCoverCoverage(before, [id(1)]);
});

test('usage, redistribution and withdrawal determine explicit missing-image reasons', () => {
  const asset = assetFixture();
  asset.rights.allowed_uses = ['noncommercial'];
  assert.equal(buildCoverSnapshot(imageCatalog(asset), coverOptions).records[0]!.unavailable_reason, 'use_not_permitted');
  asset.rights.allowed_uses = ['commercial'];
  asset.rights.redistribution_allowed = false;
  assert.equal(buildCoverSnapshot(imageCatalog(asset), coverOptions).records[0]!.unavailable_reason, 'redistribution_not_permitted');
  assert.equal(buildCoverSnapshot(imageCatalog(asset), { ...coverOptions, delivery: 'urls' }).counts.available, 1);
  assert.equal(buildCoverSnapshot(imageCatalog(asset), { ...coverOptions, withdrawn_asset_ids: [asset.id] }).records[0]!.unavailable_reason, 'withdrawn');
  asset.status = 'withdrawn';
  assert.equal(buildCoverSnapshot(imageCatalog(asset), coverOptions).records[0]!.unavailable_reason, 'withdrawn');
});

test('source and asset contracts reject forbidden hosts, missing attribution and substituted object keys', () => {
  for (const url of ['invalid', 'https://boardgamegeek.com/image/1', 'https://cf.geekdo-images.com/one.jpg', 'https://boardgamegeek.com./image', 'file:///etc/passwd'])
    assert.equal(ImageSourceUrl.safeParse(url).success, false);
  assert.equal(ImageRights.safeParse({ ...coverInput.rights, basis: 'cc-by', attribution: null }).success, false);
  const asset = assetFixture();
  asset.renditions.detail.object_key = `covers/${'d'.repeat(64)}.webp`;
  assert.equal(AssetRecord.safeParse(asset).success, false);
  const snapshot = buildCoverSnapshot(imageCatalog(), coverOptions);
  snapshot.records[0]!.cover!.edition_id = id(102);
  assert.equal(CoverSnapshot.safeParse(snapshot).success, false);
});

test('asset review requires cited facts and cannot silently replace approved artwork', () => {
  const asset = assetFixture();
  const proposal = ProposalContent.parse({ title: 'Synthetic cover', rationale: 'Review edition and usage terms.', origin: 'human', sources: [sourceFixture],
    targets: [{ entity_id: asset.id, base_revision_id: null, payload: asset, evidence: [] }] });
  const context = [game(1), edition(101, 1)];
  const missing = checkSubmission(proposal, context, []);
  assert.ok(missing.errors.some(f => f.path.startsWith('/rights') && f.code === 'evidence_required'));
  assert.ok(!missing.errors.some(f => f.path.startsWith('/renditions')));
  proposal.targets[0]!.evidence = ['edition_id', 'status', 'alt_text', 'source_url', 'acquired_on', 'rights']
    .map(field => ({ path: `/${field}`, source_id: sourceFixture.id, note: 'Synthetic test evidence.' }));
  assert.deepEqual(checkSubmission(proposal, context, []).errors, []);
  const changed = structuredClone(proposal);
  const payload = changed.targets[0]!.payload;
  if (payload.state !== 'active' || payload.entity_type !== 'asset') throw new Error('Fixture');
  payload.original.sha256 = 'e'.repeat(64);
  assert.ok(checkSubmission(changed, [...context, asset], [sourceFixture.id]).errors.some(f => f.code === 'immutable_asset'));
});

test('processing preserves the whole cover, bounds dimensions, strips metadata and never upscales', async () => {
  const bytes = await picture();
  const prepared = await prepareCover(bytes, coverInput);
  assert.deepEqual([prepared.asset.renditions.thumbnail.width, prepared.asset.renditions.thumbnail.height], [213, 320]);
  assert.deepEqual([prepared.asset.renditions.detail.width, prepared.asset.renditions.detail.height], [600, 900]);
  assert.equal(prepared.asset.original.sha256, hashBytes(bytes));
  for (const [key, data] of prepared.objects) {
    assert.equal(key, `covers/${hashBytes(data)}.webp`);
    const info = await sharp(data).metadata();
    assert.equal(info.exif, undefined);
    assert.equal(info.format, 'webp');
  }
  const wide = await prepareCover(await picture(1800, 900), coverInput);
  assert.deepEqual([wide.asset.renditions.detail.width, wide.asset.renditions.detail.height], [1200, 600]);
  const again = await prepareCover(bytes, coverInput);
  assert.deepEqual(again.asset, prepared.asset);
});

test('prepared proposals bind source evidence and current edition revision in one reviewed change', () => {
  const asset = assetFixture();
  const selected = edition(101, 1);
  const context = { edition: selected, edition_revision_id: id(501), rationale: 'Confirm this edition and permitted consumer use.',
    image_source: { ...sourceFixture, url: asset.source_url },
    permission_source: { ...sourceFixture, id: id(901), url: asset.rights.terms_url } };
  const proposal = prepareCoverProposal(asset, context);
  assert.equal(proposal.targets[1]!.base_revision_id, id(501));
  assert.deepEqual(checkSubmission(proposal, [game(1), selected], []).errors, []);
  assert.throws(() => prepareCoverProposal(asset, { ...context, edition: edition(102, 1) }), /match the edition/);
  assert.throws(() => prepareCoverProposal(asset, { ...context, image_source: sourceFixture }), /Citations must match/);
  assert.equal(selected.cover_asset_id, undefined);
});

test('processing rejects tiny, invalid, animated and unsupported input before staging', async () => {
  await assert.rejects(prepareCover(await picture(100, 100), coverInput), /at least 500/);
  await assert.rejects(prepareCover(Buffer.from('not an image'), coverInput));
  await assert.rejects(prepareCover(Buffer.from('<svg width="600" height="900"></svg>'), coverInput));
  await assert.rejects(prepareCover(Buffer.alloc(20_000_001), coverInput), /20 MB/);
  const animation = await sharp({ create: { width: 600, height: 1800, channels: 3, background: '#ff0000', pageHeight: 900 } })
    .composite([{ input: await picture(), left: 0, top: 900 }]).webp({ loop: 0, delay: [100,100] }).toBuffer();
  await assert.rejects(prepareCover(animation, coverInput), /single-frame/);
});

test('bundles verify decoded bytes and checksums, preserve immutable pins, and permit metadata-only consumers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'catalog-covers-'));
  try {
    const prepared = await prepareCover(await picture(), coverInput);
    const candidate = await writePreparedCover(root, prepared);
    assert.equal(await writePreparedCover(root, prepared), candidate);
    const snapshot = buildCoverSnapshot(imageCatalog(prepared.asset), coverOptions);
    const files = await coverBundleFiles(snapshot, join(root, 'objects'));
    assert.equal(files.size, 4);
    const destination = await writeCoverBundle(join(root, 'bundles'), files);
    assert.equal(await writeCoverBundle(join(root, 'bundles'), files), destination);
    const bytes = await readFile(join(destination, 'covers.json'));
    assert.equal(await readFile(join(destination, 'covers.sha256'), 'utf8'), `${hashBytes(bytes)}  covers.json\n`);
    const urlSnapshot = buildCoverSnapshot(imageCatalog(prepared.asset), { ...coverOptions, delivery: 'urls' });
    assert.equal((await coverBundleFiles(urlSnapshot, join(root, 'objects'))).size, 2);
    const changed = structuredClone(prepared);
    changed.asset.alt_text = 'Changed candidate metadata';
    await assert.rejects(writePreparedCover(root, changed), /already exists/);
    await writeFile(join(root, 'objects', prepared.asset.renditions.thumbnail.object_key), 'broken');
    await assert.rejects(coverBundleFiles(snapshot, join(root, 'objects')));
    // The prior complete bundle is unaffected by a failed subsequent export.
    assert.deepEqual(await readFile(join(destination, 'covers.json')), bytes);
    await writeFile(join(destination, 'covers.json'), 'damaged');
    await assert.rejects(writeCoverBundle(join(root, 'bundles'), files), /differs/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
