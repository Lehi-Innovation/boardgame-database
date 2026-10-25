import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDocument } from 'yaml';
import { NameSnapshotRecord, validateNameSnapshot } from '../../packages/contracts/src/name-snapshot.ts';

export const sha256 = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
export const normalizeName = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const usable = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 1000;
export type NameInput = { filename: string; bytes: Uint8Array };

export function compileNameSnapshot(inputs: NameInput[], commit: string) {
  const omissions: { source_id: string; index: number | null; reason: string }[] = [];
  const candidates: { record: NameSnapshotRecord; year: string | null }[] = [];
  const files: [string, string][] = [];
  for (const input of [...inputs].sort((a, b) => compare(a.filename, b.filename))) {
    if (!/^[\p{Ll}\p{N}][\p{Ll}\p{N}-]*\.yaml$/u.test(input.filename)) throw new Error(`Unsupported filename: ${input.filename}`);
    if (input.bytes.length > 1_000_000) throw new Error(`${input.filename}: exceeds 1 MB`);
    const doc = parseDocument(new TextDecoder('utf-8', { fatal: true }).decode(input.bytes), {
      schema: 'failsafe', version: '1.2', uniqueKeys: true, stringKeys: true, prettyErrors: false,
    });
    if (doc.errors.length || doc.warnings.length) throw new Error(`${input.filename}: invalid or unsupported YAML`);
    const raw: unknown = doc.toJS({ maxAliasCount: 0 });
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error(`${input.filename}: expected a mapping`);
    const data = raw as Record<string, unknown>;
    if (!usable(data.name)) throw new Error(`${input.filename}: missing or invalid name`);
    const source_id = `legacy_yaml:${encodeURIComponent(input.filename.slice(0, -5))}`;
    const aliases: string[] = [];
    const seen = new Set([normalizeName(data.name)]);
    if (data.alternate_names !== undefined && !Array.isArray(data.alternate_names)) {
      omissions.push({ source_id, index: null, reason: 'alternate_names is not an array' });
    } else {
      for (const [index, alias] of (data.alternate_names as unknown[] | undefined ?? []).entries()) {
        if (!usable(alias) || !normalizeName(alias)) {
          omissions.push({ source_id, index, reason: 'alias is not a nonempty plain name string' });
        } else if (!seen.has(normalizeName(alias))) {
          seen.add(normalizeName(alias)); aliases.push(alias);
        }
      }
    }
    const source_file = `games/${input.filename}`;
    const source_sha256 = sha256(input.bytes);
    files.push([source_file, source_sha256]);
    const record = NameSnapshotRecord.parse({ source_id, title: data.name, aliases: aliases.sort(compare), disambiguation: null, source_file, source_sha256 });
    // Only a clear, distinct lexical year disambiguates collisions. Publisher-list
    // differences do not establish different games (e.g. the two Citadels rows).
    const year = typeof data.year === 'string' && /^-?[1-9][0-9]{0,3}$/.test(data.year) ? data.year : null;
    candidates.push({ record, year });
  }
  if (!files.length || new Set(files.map(([path]) => path)).size !== files.length) throw new Error('Expected nonempty, unique input files');
  const groups = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const key = normalizeName(candidate.record.title);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  const collisions: { normalized_title: string; source_ids: string[]; resolution: 'legacy_year' | 'deferred' }[] = [];
  const deferred = new Set<string>();
  for (const [name, group] of groups) {
    if (group.length < 2) continue;
    const distinctYears = group.every(c => c.year !== null) && new Set(group.map(c => c.year)).size === group.length;
    collisions.push({ normalized_title: name, source_ids: group.map(c => c.record.source_id), resolution: distinctYears ? 'legacy_year' : 'deferred' });
    for (const candidate of group) {
      if (distinctYears) candidate.record.disambiguation = `${candidate.year} (legacy year)`;
      else deferred.add(candidate.record.source_id);
    }
  }
  const records = candidates.filter(c => !deferred.has(c.record.source_id)).map(c => c.record);
  const base = {
    schema_version: '1.0',
    source: { kind: 'legacy_yaml' as const, commit, files_sha256: sha256(jsonBytes(files)) },
    counts: { source_files: files.length, records: records.length, aliases: records.reduce((n, r) => n + r.aliases.length, 0), deferred_records: deferred.size, omitted_aliases: omissions.length },
    records,
  };
  const dataset_version = `sha256:${sha256(jsonBytes(base))}`;
  const snapshot = validateNameSnapshot({ schema_version: base.schema_version, dataset_version, source: base.source, counts: base.counts, records });
  const bytes = jsonBytes(snapshot);
  return { snapshot, bytes, checksum: sha256(bytes), report: { dataset_version, counts: base.counts, omissions, collisions, deferred_source_ids: [...deferred].sort(compare), source_files: files } };
}

export async function readNameInputs(directory: string): Promise<NameInput[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const result: NameInput[] = [];
  for (const entry of entries.filter(e => e.name.endsWith('.yaml'))) {
    if (!entry.isFile()) throw new Error(`Expected regular YAML file: ${entry.name}`);
    result.push({ filename: entry.name, bytes: await readFile(join(directory, entry.name)) });
  }
  return result;
}

// Stage the complete bundle beside its destination; one rename exposes all three
// files together. Existing immutable bundles are verified, never overwritten.
export async function writeNameBundle(parent: string, compiled: ReturnType<typeof compileNameSnapshot>) {
  await mkdir(parent, { recursive: true });
  const destination = join(parent, compiled.snapshot.dataset_version.replace(':', '-'));
  const staged = join(parent, `.staging-${randomUUID()}`);
  const contents = { 'snapshot.json': compiled.bytes, 'snapshot.sha256': `${compiled.checksum}  snapshot.json\n`, 'report.json': jsonBytes(compiled.report) };
  await mkdir(staged);
  try {
    for (const [file, bytes] of Object.entries(contents)) await writeFile(join(staged, file), bytes, { flag: 'wx' });
    try { await rename(staged, destination); }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      for (const [file, bytes] of Object.entries(contents)) if (await readFile(join(destination, file), 'utf8') !== bytes) throw new Error('Existing snapshot bundle differs; refusing to overwrite');
    }
  } finally { await rm(staged, { recursive: true, force: true }); }
  return destination;
}
