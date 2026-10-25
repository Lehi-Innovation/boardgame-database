import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { AssetRecord, CoverMetadata, CoverSnapshot, Id, z } from '@catalog/contracts';

export const hashBytes = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const CoverInput = z.strictObject({
  id: Id,
  edition_id: Id,
  alt_text: CoverMetadata.shape.alt_text,
  source_url: CoverMetadata.shape.source_url,
  acquired_on: CoverMetadata.shape.acquired_on,
  rights: CoverMetadata.shape.rights,
});
const MAX_BYTES = 20_000_000;
const options = { failOn: 'warning' as const, limitInputPixels: 40_000_000 };

/** Only local bytes are accepted. Fetching arbitrary remote URLs is not a server capability. */
export async function prepareCover(bytes: Buffer, input: unknown) {
  const metadata = CoverInput.parse(input);
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Cover must be at most 20 MB');
  const original = await sharp(bytes, options).metadata();
  if (!['jpeg', 'png', 'webp'].includes(original.format) || (original.pages ?? 1) !== 1)
    throw new Error('Use a single-frame JPEG, PNG or WebP cover');
  if (!original.width || !original.height || Math.max(original.width, original.height) < 500 || Math.min(original.width, original.height) < 200)
    throw new Error('Cover needs at least 500 pixels on its long edge and 200 on its short edge');
  const objects = new Map<string, Buffer>();
  async function rendition(size: number) {
    // Auto-orient, preserve the complete box front, never upscale; default output strips metadata.
    const { data, info } = await sharp(bytes, options).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 }).toBuffer({ resolveWithObject: true });
    const sha256 = hashBytes(data);
    const object_key = `covers/${sha256}.webp`;
    objects.set(object_key, data);
    return { sha256, object_key, media_type: 'image/webp' as const, width: info.width, height: info.height, bytes: data.length };
  }
  const thumbnail = await rendition(320);
  const detail = await rendition(1200);
  const asset = AssetRecord.parse({
    ...metadata, schema_version: 1, entity_type: 'asset', state: 'active', status: 'available', field_notes: [],
    original: { sha256: hashBytes(bytes), media_type: `image/${original.format}`, width: original.width, height: original.height, bytes: bytes.length },
    renditions: { thumbnail, detail },
  });
  return { asset, objects };
}

export async function readCoverFile(path: string) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('Expected a regular image file of at most 20 MB');
  return readFile(path);
}

/** Verify all referenced bytes, including for URL-only output, before advertising them. */
export async function coverBundleFiles(snapshotInput: unknown, objectRoot: string) {
  const snapshot = CoverSnapshot.parse(snapshotInput);
  const bytes = Buffer.from(`${JSON.stringify(snapshot, null, 2)}\n`);
  const files = new Map<string, Uint8Array>([['covers.json', bytes], ['covers.sha256', Buffer.from(`${hashBytes(bytes)}  covers.json\n`)]]);
  const checked = new Map<string, Buffer>();
  for (const row of snapshot.records) if (row.cover) for (const rendition of [row.cover.thumbnail, row.cover.detail]) {
    let data = checked.get(rendition.object_key);
    if (!data) {
      data = await readCoverFile(join(objectRoot, rendition.object_key));
      checked.set(rendition.object_key, data);
    }
    const info = await sharp(data, options).metadata();
    if (data.length !== rendition.bytes || hashBytes(data) !== rendition.sha256 || info.format !== 'webp'
      || info.width !== rendition.width || info.height !== rendition.height || (info.pages ?? 1) !== 1)
      throw new Error(`Corrupt or mismatched image object: ${rendition.object_key}`);
    // Decode too: a valid header is not proof of a complete image.
    await sharp(data, options).raw().toBuffer();
    if (snapshot.delivery === 'bundled') files.set(rendition.object_key, data);
  }
  return files;
}

/** Content-addressed staging. Preparation never approves or publishes an asset. */
export async function writePreparedCover(root: string, prepared: Awaited<ReturnType<typeof prepareCover>>) {
  await mkdir(root, { recursive: true });
  for (const [key, bytes] of prepared.objects) {
    const target = join(root, 'objects', key);
    await mkdir(dirname(target), { recursive: true });
    try { await writeFile(target, bytes, { flag: 'wx' }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (!(await readFile(target)).equals(bytes)) throw new Error(`Existing object differs: ${key}`);
    }
  }
  const text = `${JSON.stringify(prepared.asset, null, 2)}\n`;
  const target = join(root, `${prepared.asset.id}.json`);
  // Immutable candidates too: changing metadata requires a separate output directory.
  try { await writeFile(target, text, { flag: 'wx' }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (await readFile(target, 'utf8') !== text) throw new Error('Asset candidate already exists with different content');
  }
  return target;
}

/** Expose an entire immutable bundle in one rename; retries verify every expected file. */
export async function writeCoverBundle(parent: string, files: Map<string, Uint8Array>) {
  const manifest = files.get('covers.json');
  if (!manifest) throw new Error('Missing cover snapshot');
  await mkdir(parent, { recursive: true });
  const destination = join(parent, `sha256-${hashBytes(manifest)}`);
  const staged = join(parent, `.staging-${randomUUID()}`);
  await mkdir(staged);
  try {
    for (const [name, bytes] of files) {
      if (!['covers.json', 'covers.sha256'].includes(name) && !/^covers\/[a-f0-9]{64}\.webp$/.test(name)) throw new Error('Invalid bundle path');
      await mkdir(dirname(join(staged, name)), { recursive: true });
      await writeFile(join(staged, name), bytes, { flag: 'wx' });
    }
    try { await rename(staged, destination); }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      for (const [name, bytes] of files) if (!(await readFile(join(destination, name))).equals(Buffer.from(bytes))) throw new Error('Existing cover bundle differs; refusing to overwrite');
    }
  } finally { await rm(staged, { recursive: true, force: true }); }
  return destination;
}
