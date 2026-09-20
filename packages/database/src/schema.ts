import { pgSchema, uuid, text, integer, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import type { CatalogRecord } from '@catalog/contracts';

// Query mappings only. Constraints, triggers, grants, and RLS live in SQL migrations.
const editorial = pgSchema('editorial');
const catalog = pgSchema('catalog');
export const entities = editorial.table('entities', {
  id: uuid().primaryKey(),
  entityType: text('entity_type').$type<CatalogRecord['entity_type']>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const revisions = editorial.table('revisions', {
  id: uuid().primaryKey(),
  entityId: uuid('entity_id').notNull(),
  entityType: text('entity_type').$type<CatalogRecord['entity_type']>().notNull(),
  schemaVersion: integer('schema_version').notNull(),
  payload: jsonb().$type<CatalogRecord>().notNull(),
  payloadHash: text('payload_hash').notNull(),
  approvalId: uuid('approval_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const approvedHeads = editorial.table('approved_heads', {
  entityId: uuid('entity_id').primaryKey(),
  revisionId: uuid('revision_id').notNull(),
});
export const revisionReferences = editorial.table('revision_references', {
  revisionId: uuid('revision_id').notNull(),
  fieldPath: text('field_path').notNull(),
  targetId: uuid('target_id').notNull(),
  targetType: text('target_type').notNull(),
  relation: text().notNull(),
}, table => [primaryKey({ columns: [table.revisionId, table.fieldPath] })]);
export const revisionEvidence = editorial.table('revision_evidence', {
  revisionId: uuid('revision_id').notNull(),
  fieldPath: text('field_path').notNull(),
  sourceId: uuid('source_id').notNull(),
  note: text(),
}, table => [primaryKey({ columns: [table.revisionId, table.fieldPath, table.sourceId] })]);
export const releases = catalog.table('releases', {
  id: text().primaryKey(),
  state: text().$type<'building' | 'ready' | 'failed'>().notNull(),
  schemaVersion: integer('schema_version').notNull(),
  contractVersion: text('contract_version').notNull(),
  manifest: jsonb(),
});
export const documents = catalog.table('documents', {
  releaseId: text('release_id').notNull(),
  entityId: uuid('entity_id').notNull(),
  document: jsonb().$type<Record<string, unknown>>().notNull(),
}, table => [primaryKey({ columns: [table.releaseId, table.entityId] })]);
