import { CatalogRecord, ProposalContent, type z } from '@catalog/contracts';
import { canonicalJson, validateProposal, type Finding } from './index.ts';

export const VALIDATOR_VERSION = 'm2.1';
export class CommandError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: unknown) { super(message); }
}
export type Actor = { userId: string; sessionId: string; expiresAt: number };
export type Change = { entity_id: string; path: string; before: unknown; after: unknown };
const pointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');

// Primitive lists compare as units; object lists retain field paths used by citations.
export function changesBetween(before: unknown, after: unknown, path = ''): Omit<Change, 'entity_id'>[] {
  if (canonicalJson(before ?? null) === canonicalJson(after ?? null)) return [];
  if (Array.isArray(after) && after.length && after.every(value => value && typeof value === 'object') && (!Array.isArray(before) || before.length <= after.length)) {
    return after.flatMap((value, index) => changesBetween(Array.isArray(before) ? before[index] : undefined, value, `${path}/${index}`));
  }
  if (after && typeof after === 'object' && !Array.isArray(after)) {
    const old = before && typeof before === 'object' ? before as Record<string, unknown> : {};
    const next = after as Record<string, unknown>;
    return [...new Set([...Object.keys(old), ...Object.keys(next)])].flatMap(key => changesBetween(old[key], next[key], `${path}/${pointer(key)}`));
  }
  return [{ path, before: before ?? null, after: after ?? null }];
}

export function checkSubmission(content: z.infer<typeof ProposalContent>, approved: CatalogRecord[], sourceIds: string[]) {
  const errors = validateProposal(content, approved, sourceIds);
  const warnings: Finding[] = [];
  const changes: Change[] = [];
  const before = new Map(approved.map(record => [record.id, record]));
  const nonFactual = new Set(['schema_version', 'id', 'entity_type', 'state', 'field_notes', 'default_edition_id', 'kind', 'mechanics', 'themes', 'styles', 'families', 'compatible_with', 'canonical_id', 'reason']);
  for (const target of content.targets) {
    const old = before.get(target.entity_id);
    const current = target.payload;
    const diff = changesBetween(old, current).map(change => ({ ...change, entity_id: target.entity_id }));
    changes.push(...diff);
    const evidenceKeys = target.evidence.map(item => `${item.path}:${item.source_id}`);
    if (new Set(evidenceKeys).size !== evidenceKeys.length) errors.push({ entity_id: target.entity_id, path: '/evidence', code: 'duplicate_evidence', message: 'Each field/source citation must occur once.' });
    for (const change of diff) {
      // A merge is an attributed identity decision. Removed active fields do not exist
      // on its tombstone and cannot carry new field citations; dependent edits still can.
      if (current.state === 'merged') continue;
      const field = change.path.split('/')[1]!;
      if (nonFactual.has(field) || current.entity_type === 'assessment' || current.entity_type === 'taxonomy') continue;
      // Missing optional assertions are allowed on new records; removing an existing fact needs explanation.
      if (!old && (change.after === null || (Array.isArray(change.after) && !change.after.length))) continue;
      const supports = (path: string) => path === change.path || change.path.startsWith(`${path}/`);
      const unknown = current.state === 'active' && current.field_notes.some(note => supports(note.path) && (change.after === null || (Array.isArray(change.after) && !change.after.length)));
      if (!unknown && !target.evidence.some(evidence => supports(evidence.path))) errors.push({ entity_id: target.entity_id, path: change.path, code: 'evidence_required', message: 'Cite this changed fact, or explain why it is now unknown.' });
    }
    if (old && old.entity_type !== current.entity_type) errors.push({ entity_id: current.id, path: '/entity_type', code: 'identity_type', message: 'An identity cannot change entity type.' });
    if (current.state === 'active' && 'name' in current) {
      const names = [current.name, ...current.aliases.map(alias => alias.name)].map(name => name.toLocaleLowerCase('en'));
      for (const other of approved) if (other.id !== current.id && other.entity_type === current.entity_type && other.state === 'active' && 'name' in other && [other.name, ...other.aliases.map(alias => alias.name)].some(name => names.includes(name.toLocaleLowerCase('en')))) {
        warnings.push({ entity_id: current.id, path: '/name', code: 'possible_duplicate', message: `Review possible duplicate ${other.name} (${other.id}).` });
      }
    }
  }
  if (content.origin !== 'human') warnings.push({ entity_id: content.targets[0]!.entity_id, path: '/origin', code: 'human_review_required', message: 'AI/import content requires an explicit human evidence review.' });
  return { errors, warnings, changes };
}
