import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import { CatalogRecord, Evidence, Id, z } from '@catalog/contracts';
import { contentHash, referencesOf } from '@catalog/domain';
import * as schema from './schema.ts';

export { schema };
export { EditorialService } from './editorial.ts';
export type CatalogDatabase = PostgresJsDatabase<typeof schema>;
export type CatalogTransaction = Parameters<Parameters<CatalogDatabase['transaction']>[0]>[0];

export function connectDatabase(url: string) {
  // Credentials are supplied server-side. No environment/global connection at import time.
  const client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

const RevisionWrite = z.strictObject({
  revision_id: Id,
  approval_id: Id,
  payload: CatalogRecord,
  evidence: z.array(Evidence),
});

/** Internal storage primitive, not an authorization or approval command.
 * M2's command must supply a recorded approval after full graph/evidence/conflict validation.
 * Does not advance approved_heads: a multi-target approval must do that in its outer transaction.
 */
export async function insertApprovedRevision(tx: CatalogTransaction, input: z.infer<typeof RevisionWrite>) {
  const value = RevisionWrite.parse(input);
  await tx.insert(schema.revisions).values({
    id: value.revision_id, entityId: value.payload.id, entityType: value.payload.entity_type,
    schemaVersion: value.payload.schema_version, payload: value.payload,
    payloadHash: contentHash(value.payload), approvalId: value.approval_id,
  });
  const references = referencesOf(value.payload);
  if (references.length) await tx.insert(schema.revisionReferences).values(references.map(ref => ({
    revisionId: value.revision_id, fieldPath: ref.path, targetId: ref.target_id,
    targetType: ref.target_type, relation: ref.relation,
  })));
  if (value.evidence.length) await tx.insert(schema.revisionEvidence).values(value.evidence.map(evidence => ({
    revisionId: value.revision_id, fieldPath: evidence.path, sourceId: evidence.source_id, note: evidence.note,
  })));
}

/** Reads only frozen public documents, including when called with a privileged test connection. */
export async function readPublishedDocument(db: CatalogDatabase, releaseId: string, entityId: string) {
  const rows = await db.select({ document: schema.documents.document })
    .from(schema.documents)
    .innerJoin(schema.releases, eq(schema.releases.id, schema.documents.releaseId))
    .where(and(eq(schema.releases.state, 'ready'), eq(schema.documents.releaseId, releaseId), eq(schema.documents.entityId, entityId)));
  return rows[0]?.document ?? null;
}
