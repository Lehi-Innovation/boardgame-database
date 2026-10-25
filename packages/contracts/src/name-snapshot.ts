import { z } from 'zod';

// A legacy reference feed, independent of approved catalog/release contracts.
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const SourceId = z.string().regex(/^legacy_yaml:(?:[a-z0-9-]|%[0-9A-F]{2})+$/).max(1000);
const SourceFile = z.string().regex(/^games\/[^/\\\r\n]+\.yaml$/).max(311);
const Name = z.string().min(1).max(1000).regex(/\S/u);
const Count = z.int().nonnegative().max(1_000_000);

// Consumers may ignore additive fields within major version 1.
export const NameSnapshotRecord = z.looseObject({
  source_id: SourceId,
  title: Name,
  aliases: z.array(Name).max(1000),
  disambiguation: Name.nullable(),
  source_file: SourceFile,
  source_sha256: Sha256,
});
export const NameSnapshot = z.looseObject({
  schema_version: z.string().regex(/^1\.[0-9]+$/),
  dataset_version: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  source: z.looseObject({
    kind: z.literal('legacy_yaml'),
    commit: z.string().regex(/^[0-9a-f]{40}$/),
    // Digest of sorted [path, exact-byte SHA-256] pairs, including deferred rows.
    files_sha256: Sha256,
  }),
  counts: z.looseObject({
    source_files: Count, records: Count, aliases: Count,
    deferred_records: Count, omitted_aliases: Count,
  }),
  records: z.array(NameSnapshotRecord).max(1_000_000),
});
export type NameSnapshot = z.infer<typeof NameSnapshot>;
export type NameSnapshotRecord = z.infer<typeof NameSnapshotRecord>;

export function validateNameSnapshot(value: unknown): NameSnapshot {
  const snapshot = NameSnapshot.parse(value);
  const ids = snapshot.records.map(record => record.source_id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate source IDs');
  if (snapshot.counts.records !== ids.length || snapshot.counts.aliases !== snapshot.records.reduce((n, r) => n + r.aliases.length, 0)
    || snapshot.counts.source_files !== ids.length + snapshot.counts.deferred_records) throw new Error('Snapshot counts do not match records');
  for (const record of snapshot.records) {
    if (record.source_id !== `legacy_yaml:${encodeURIComponent(record.source_file.slice(6, -5))}`) throw new Error('Source ID/file mismatch');
    if (new Set(record.aliases).size !== record.aliases.length) throw new Error('Duplicate aliases');
  }
  return snapshot;
}
