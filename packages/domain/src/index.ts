import { createHash } from 'node:crypto';
import { CatalogRecord, ProposalContent, type ActiveRecord, type z } from '@catalog/contracts';

export type Reference = {
  path: string;
  target_id: string;
  target_type: CatalogRecord['entity_type'];
  relation: string;
};
export type Finding = { entity_id: string; path: string; code: string; message: string };

/** Canonical JSON for validated JSON values; array order is part of the contract. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
      throw new TypeError('Expected a JSON value');
    }
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

export function contentHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function referencesOf(record: CatalogRecord): Reference[] {
  const result: Reference[] = [];
  const add = (path: string, id: string | null, type: Reference['target_type'], relation: string) => {
    if (id !== null) result.push({ path, target_id: id, target_type: type, relation });
  };
  const many = (field: string, ids: string[], type: Reference['target_type']) =>
    ids.forEach((id, index) => add(`/${field}/${index}`, id, type, field));
  if (record.state === 'merged') {
    add('/canonical_id', record.canonical_id, record.entity_type, 'merge');
    return result;
  }
  switch (record.entity_type) {
    case 'game':
      add('/default_edition_id', record.default_edition_id, 'edition', 'default_edition');
      many('designers', record.designers, 'person');
      for (const field of ['mechanics', 'themes', 'styles'] as const) many(field, record[field], 'taxonomy');
      many('families', record.families, 'family');
      record.relationships.forEach((ref, index) => add(`/relationships/${index}/target_id`, ref.target_id, 'game', ref.kind));
      break;
    case 'edition':
      add('/game_id', record.game_id, 'game', 'edition_of');
      many('publishers', record.publishers, 'organization');
      many('artists', record.artists, 'person');
      many('compatible_with', record.compatible_with, 'edition');
      record.play_specifications.forEach((spec, index) => {
        if (spec.context.kind === 'with_base_game') add(`/play_specifications/${index}/context/base_game_id`, spec.context.base_game_id, 'game', 'play_context');
      });
      break;
    case 'taxonomy':
      add('/replacement_id', record.replacement_id, 'taxonomy', 'replacement');
      break;
    case 'assessment':
      add('/subject_id', record.subject_id, record.subject_type, 'assessment_subject');
      break;
  }
  return result;
}

export function pathExists(value: unknown, pointer: string): boolean {
  let current = value;
  for (const raw of pointer.slice(1).split('/')) {
    const part = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, part)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

/** Validate the complete candidate graph, including unchanged dependencies. No I/O. */
export function validateCatalog(input: readonly unknown[]): Finding[] {
  const findings: Finding[] = [];
  const records = input.map(record => CatalogRecord.parse(record));
  const byId = new Map<string, CatalogRecord>();
  const identifiers = new Map<string, string>();
  const fail = (record: CatalogRecord, path: string, code: string, message: string) =>
    findings.push({ entity_id: record.id, path, code, message });
  for (const record of records) {
    if (byId.has(record.id)) fail(record, '/id', 'duplicate_id', 'Multiple records have the same stable identity');
    byId.set(record.id, record);
  }
  for (const record of records) {
    const seenRefs = new Set<string>();
    for (const ref of referencesOf(record)) {
      const target = byId.get(ref.target_id);
      const key = `${ref.relation}:${ref.target_id}`;
      if (seenRefs.has(key)) fail(record, ref.path, 'duplicate_reference', 'Reference is repeated');
      seenRefs.add(key);
      if (!target) { fail(record, ref.path, 'missing_reference', 'Target must exist in the same candidate graph'); continue; }
      if (target.entity_type !== ref.target_type) fail(record, ref.path, 'reference_type', `Expected ${ref.target_type}`);
      if (ref.target_id === record.id) fail(record, ref.path, 'self_reference', 'Entity cannot reference itself');
      if (target.state === 'merged' && ref.relation !== 'merge') fail(record, ref.path, 'merged_reference', 'Update the reference to the surviving identity in the merge proposal');
      if (ref.relation === 'compatible_with' && record.id >= target.id) fail(record, ref.path, 'compatibility_order', 'Store symmetric compatibility once, on the lexicographically smaller UUID');
      if (target.state === 'active' && target.entity_type === 'taxonomy') {
        const vocabulary = { mechanics: 'mechanic', themes: 'theme', styles: 'style' }[ref.relation];
        if (vocabulary && target.vocabulary !== vocabulary) fail(record, ref.path, 'taxonomy_vocabulary', `Expected a ${vocabulary} term`);
      }
    }
    if (record.state === 'merged') {
      const visited = new Set([record.id]);
      let target = byId.get(record.canonical_id);
      while (target?.state === 'merged') {
        if (visited.has(target.id)) { fail(record, '/canonical_id', 'merge_cycle', 'Merge redirects cannot form cycles'); break; }
        visited.add(target.id);
        target = byId.get(target.canonical_id);
      }
      continue;
    }
    for (const note of record.field_notes) {
      if (!pathExists(record, note.path) || note.path.startsWith('/field_notes')) fail(record, note.path, 'note_path', 'Field note must identify a record field');
    }
    if ('identifiers' in record) for (const [index, identifier] of record.identifiers.entries()) {
      const key = JSON.stringify([identifier.namespace, identifier.value]);
      if (identifiers.has(key)) fail(record, `/identifiers/${index}`, 'identifier_claim', 'External identifier already claimed');
      identifiers.set(key, record.id);
    }
    if (record.entity_type === 'game') {
      const expands = record.relationships.filter(ref => ref.kind === 'expands');
      if (record.kind === 'expansion' && expands.length === 0) fail(record, '/relationships', 'expansion_base', 'An expansion needs a supported base game');
      if (record.kind === 'base_game' && expands.length > 0) fail(record, '/relationships', 'base_game_expands', 'Only expansions and standalone expansions can expand another game');
      for (const ref of expands) {
        const target = byId.get(ref.target_id);
        if (target?.state === 'active' && target.entity_type === 'game' && target.kind === 'expansion') fail(record, '/relationships', 'expansion_target', 'A supported base must be playable independently');
      }
      const edition = record.default_edition_id ? byId.get(record.default_edition_id) : null;
      if (edition?.state === 'active' && edition.entity_type === 'edition' && edition.game_id !== record.id) fail(record, '/default_edition_id', 'edition_owner', 'Default edition belongs to a different game');
    }
    if (record.entity_type === 'edition') {
      const game = byId.get(record.game_id);
      if (game?.state === 'active' && game.entity_type === 'game') for (const spec of record.play_specifications) {
        if (spec.context.kind === 'standalone' && game.kind === 'expansion') fail(record, '/play_specifications', 'expansion_standalone', 'A non-standalone expansion cannot claim standalone play');
        if (spec.context.kind === 'with_base_game') {
          const base = spec.context.base_game_id;
          if (!game.relationships.some(ref => ref.kind === 'expands' && ref.target_id === base)) fail(record, '/play_specifications', 'unsupported_context', 'Context must be one of the game’s supported bases');
        }
      }
    }
    if (record.entity_type === 'taxonomy' && record.replacement_id !== null) {
      const target = byId.get(record.replacement_id);
      if (!record.retired || (target?.state === 'active' && target.entity_type === 'taxonomy' && target.vocabulary !== record.vocabulary)) fail(record, '/replacement_id', 'taxonomy_replacement', 'Only retired terms can name a replacement in the same vocabulary');
    }
  }
  return findings;
}

export function validateProposal(input: unknown, approved: readonly CatalogRecord[], existingSourceIds: readonly string[] = []): Finding[] {
  const content = ProposalContent.parse(input);
  const candidate = new Map(approved.map(record => [record.id, record]));
  for (const target of content.targets) candidate.set(target.entity_id, target.payload);
  const findings = validateCatalog([...candidate.values()]);
  const sources = new Set([...existingSourceIds, ...content.sources.map(source => source.id)]);
  for (const target of content.targets) for (const evidence of target.evidence) {
    if (!sources.has(evidence.source_id)) findings.push({ entity_id: target.entity_id, path: evidence.path, code: 'missing_source', message: 'Evidence source does not exist' });
    if (!pathExists(target.payload, evidence.path)) findings.push({ entity_id: target.entity_id, path: evidence.path, code: 'evidence_path', message: 'Evidence must identify an existing field' });
  }
  return findings;
}

export function standaloneSpecs(edition: Extract<ActiveRecord, { entity_type: 'edition' }>) {
  const spec = edition.play_specifications.find(spec => spec.context.kind === 'standalone');
  return { player_support: spec?.player_support ?? null, playtime_minutes: spec?.playtime_minutes ?? null, min_age: spec?.min_age ?? null };
}

export type ProposalContent = z.infer<typeof ProposalContent>;
export { CommandError, VALIDATOR_VERSION, changesBetween, checkSubmission } from './editorial.ts';
export type { Actor } from './editorial.ts';
