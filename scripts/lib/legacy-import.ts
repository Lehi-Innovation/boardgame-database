import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { parseDocument } from 'yaml';
import { CatalogRecord, Hash, Id, Identifier, Name, ProposalContent, Text, z } from '@catalog/contracts';
import { checkSubmission, CommandError, contentHash } from '@catalog/domain';

const Slug = z.string().max(300).regex(/^[a-z0-9][a-z0-9-]*$/);
const Prepared = z.strictObject({
  content: ProposalContent,
  // A reviewed compare-and-swap baseline, not a version guessed by the importer.
  expected_version: z.int().nonnegative(),
  expected_content_hash: Hash.nullable(),
}).refine(value => (value.expected_version === 0) === (value.expected_content_hash === null), 'New proposals use version 0/null; updates require both the current version and content hash');
export const ImportEntry = z.strictObject({
  legacy_id: Slug,
  source_hash: Hash,
  candidate: z.strictObject({ name: Name, identifiers: z.array(Identifier) }),
  game_id: Id,
  edition_id: Id.nullable(),
  proposal_id: Id,
  identity: z.strictObject({ status: z.enum(['pending', 'prepared']), rationale: Text }),
  prepared: Prepared.nullable(),
});
export const ImportManifest = z.strictObject({
  format_version: z.literal(1),
  dataset: Slug,
  legacy_commit: z.string().regex(/^[0-9a-f]{40}$/),
  consumer: z.strictObject({ name: Name, commit: z.string().regex(/^[0-9a-f]{40}$/), path: Text, source_hash: Hash }),
  entries: z.array(ImportEntry).min(1).max(100),
}).superRefine((manifest, ctx) => {
  for (const key of ['legacy_id', 'proposal_id'] as const) {
    if (new Set(manifest.entries.map(entry => entry[key])).size !== manifest.entries.length) ctx.addIssue({ code: 'custom', message: `Duplicate ${key}` });
  }
  const games = new Set(manifest.entries.map(entry => entry.game_id));
  if (manifest.entries.some(entry => entry.edition_id && games.has(entry.edition_id))) ctx.addIssue({ code: 'custom', message: 'Game and edition identities must be distinct' });
});
export type ImportEntry = z.infer<typeof ImportEntry>;
export type ImportManifest = z.infer<typeof ImportManifest>;
export type Content = z.infer<typeof ProposalContent>;
export const sourceHash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');

// Failsafe scalars remain strings: neither a filename "007" nor a large external
// identifier can become an integer. No YAML value is promoted to a catalog fact.
export function inspectLegacy(bytes: Uint8Array) {
  if (bytes.length > 1_000_000) throw new Error('Legacy file exceeds 1 MB');
  const doc = parseDocument(new TextDecoder('utf-8', { fatal: true }).decode(bytes), {
    schema: 'failsafe', version: '1.2', uniqueKeys: true, stringKeys: true,
    prettyErrors: false,
  });
  if (doc.errors.length || doc.warnings.length) throw new Error('Legacy YAML has errors, duplicate keys, or unsupported tags');
  const raw: unknown = doc.toJS({ maxAliasCount: 0 });
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error('Legacy YAML must contain one mapping');
  const values = raw as Record<string, unknown>;
  const pick = (keys: string[]) => Object.fromEntries(keys.filter(key => Object.hasOwn(values, key)).map(key => [key, values[key]]));
  return {
    identity_clues: pick(['id', 'name', 'alternate_names', 'bgg_id', 'edition', 'game_family', 'base_game', 'expansions', 'compatible_with']),
    unverified_facts: pick(['year', 'possible_counts', 'min_playtime', 'max_playtime', 'playtime_minutes', 'min_age']),
    unmapped_terms: pick(['designer', 'publisher', 'artist', 'categories', 'evokes']),
    // Never copy personal values, prose, images, or assessments into reports or proposals.
    omitted_fields: Object.keys(values).filter(key => ![
      'id', 'name', 'alternate_names', 'bgg_id', 'edition', 'game_family', 'base_game', 'expansions', 'compatible_with',
      'year', 'possible_counts', 'min_playtime', 'max_playtime', 'playtime_minutes', 'min_age',
      'designer', 'publisher', 'artist', 'categories', 'evokes',
    ].includes(key)).sort(),
  };
}

export function compileEntry(manifest: ImportManifest, entry: ImportEntry, bytes: Uint8Array, approved: CatalogRecord[] = []) {
  const actualHash = sourceHash(bytes);
  const blockers: string[] = [];
  let legacy: ReturnType<typeof inspectLegacy> | null = null;
  try { legacy = inspectLegacy(bytes); } catch (error) { blockers.push((error as Error).message); }
  if (actualHash !== entry.source_hash) blockers.push('Source bytes changed. Review the file and update its pinned source_hash before importing.');
  if (entry.identity.status !== 'prepared') blockers.push('Identity mapping needs maintainer preparation.');
  if (!entry.prepared) blockers.push('Prepare explicit catalog content and allowed field evidence.');
  let content: Content | null = null;
  if (entry.prepared) {
    const targets = entry.prepared.content.targets;
    const game = targets.find(target => target.entity_id === entry.game_id)?.payload;
    if (!game || game.entity_type !== 'game') blockers.push('Prepared proposal must target the mapped game ID.');
    if (game?.state === 'active' && game.entity_type === 'game' && game.default_edition_id !== entry.edition_id) blockers.push('The default edition must match the explicit mapping (null means unknown).');
    if (entry.edition_id) {
      const edition = targets.find(target => target.entity_id === entry.edition_id)?.payload
        ?? approved.find(record => record.id === entry.edition_id);
      if (!edition || edition.state !== 'active' || edition.entity_type !== 'edition' || edition.game_id !== entry.game_id) blockers.push('Mapped edition must belong to the mapped game, in this proposal or the approved context.');
    }
    // Provenance is part of the reviewed, hashed proposal. It is never evidence.
    const provenance = JSON.stringify({ dataset: manifest.dataset, legacy_id: entry.legacy_id, source_hash: actualHash,
      game_id: entry.game_id, edition_id: entry.edition_id, identity_rationale: entry.identity.rationale });
    const parsed = ProposalContent.safeParse({ ...entry.prepared.content, origin: 'import',
      rationale: `${entry.prepared.content.rationale}\n\nLegacy import provenance (not factual evidence): ${provenance}` });
    if (parsed.success) content = parsed.data;
    else blockers.push('Prepared content plus provenance exceeds the proposal contract limits.');
  }
  const validation = content ? checkSubmission(content, approved, []) : null;
  return { legacy_id: entry.legacy_id, source_hash: actualHash, game_id: entry.game_id, edition_id: entry.edition_id,
    proposal_id: entry.proposal_id, candidate: entry.candidate, identity: entry.identity, legacy,
    blockers, content, content_hash: content ? contentHash(content) : null, validation };
}
export type ImportPlan = ReturnType<typeof compileEntry>;

export async function readLegacy(directory: string, slug: string) {
  Slug.parse(slug);
  const root = await realpath(directory);
  const file = await realpath(resolve(root, `${slug}.yaml`));
  if (!file.startsWith(`${root}${sep}`)) throw new Error('Legacy source must remain inside the games directory');
  return readFile(file);
}

export type ProposalDetail = { id: string; own: boolean; state: string; version: number; draft: Content };
export interface ImportCommands {
  detail(id: string): Promise<ProposalDetail | null>;
  save(input: { proposal_id: string; expected_version: number; content: Content }): Promise<unknown>;
  submit(input: { proposal_id: string; expected_version: number }): Promise<unknown>;
}
const conflict = (message: string): never => { throw new CommandError(409, 'import_conflict', message); };

/** Only the existing authenticated save/submit commands are available here. */
export async function importProposal(entry: ImportEntry, plan: ImportPlan, commands: ImportCommands, submit = false) {
  if (plan.blockers.length || !plan.content || !entry.prepared) throw new Error(`${entry.legacy_id}: ${plan.blockers.join(' ')}`);
  if (submit && plan.validation?.errors.length) throw new Error('Submission has unresolved domain/evidence checks. Save a draft or fix the report.');
  // Reconcile committed responses lost in transit, including concurrent identical runs.
  let current = await commands.detail(entry.proposal_id);
  if (current && !current.own) conflict('Only the original proposal author may import or retry it.');
  const matches = (detail: ProposalDetail | null) => detail && contentHash(detail.draft) === plan.content_hash;
  let saved = false;
  if (!matches(current)) {
    if (current) {
      if (!['draft', 'submitted', 'changes_requested'].includes(current.state)) conflict('Proposal is terminal. Prepare a new proposal ID with the same entity mapping and explicit approved base revisions.');
      if (current.version !== entry.prepared.expected_version || contentHash(current.draft) !== entry.prepared.expected_content_hash) conflict('Existing draft differs from the reviewed version/hash. Inspect it before preparing an update.');
    } else if (entry.prepared.expected_version !== 0) conflict('Expected proposal is missing or inaccessible.');
    try {
      await commands.save({ proposal_id: entry.proposal_id, expected_version: entry.prepared.expected_version, content: plan.content });
      saved = true;
    } catch (error) {
      current = await commands.detail(entry.proposal_id);
      if (!current?.own || !matches(current)) throw error;
    }
    current = await commands.detail(entry.proposal_id);
  }
  if (!current?.own || !matches(current)) conflict('Proposal changed while importing. Inspect the current draft.');
  if (submit && current!.state === 'draft') {
    try { await commands.submit({ proposal_id: entry.proposal_id, expected_version: current!.version }); }
    catch (error) {
      const retry = await commands.detail(entry.proposal_id);
      if (!retry?.own || !matches(retry) || !['submitted', 'approved'].includes(retry.state)) throw error;
    }
    current = await commands.detail(entry.proposal_id);
    if (!current?.own || !matches(current)) conflict('Proposal changed while submitting.');
  } else if (submit && !['submitted', 'approved'].includes(current!.state)) {
    conflict('This version is no longer awaiting submission; inspect its review decision.');
  }
  return { legacy_id: entry.legacy_id, proposal_id: entry.proposal_id, version: current!.version,
    state: current!.state, content_hash: plan.content_hash, saved };
}

export function editorialClient(origin: string, token: string, request: typeof fetch = fetch) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Importer accepts a loopback application origin only. Hosted imports are not enabled.');
  if (!token || /\s/.test(token)) throw new Error('Set CATALOG_IMPORT_TOKEN to a signed-in user access token.');
  async function call(path: string, body?: unknown): Promise<unknown> {
    const serialized = body === undefined ? undefined : JSON.stringify(body);
    if (serialized && Buffer.byteLength(serialized) > 256_000) throw new Error('Proposal exceeds the editorial HTTP body limit');
    const response = await request(`${url.origin}/api/editorial/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(serialized === undefined ? {} : { body: serialized }),
      redirect: 'error', signal: AbortSignal.timeout(20_000), cache: 'no-store',
    });
    if (!response.ok) throw new CommandError(response.status, 'import_http', `Editorial request failed (${response.status}); check sign-in, ownership, validation, or rate limits.`);
    const result = await response.json() as { data: unknown };
    return result.data;
  }
  return {
    async detail(id: string) {
      try { return await call(`proposals/${Id.parse(id)}`) as ProposalDetail; }
      catch (error) { if (error instanceof CommandError && error.status === 404) return null; throw error; }
    },
    save: (input: Parameters<ImportCommands['save']>[0]) => call('proposals/save', input),
    submit: (input: Parameters<ImportCommands['submit']>[0]) => call('proposals/submit', input),
    async records() { return await call('records') as { entity_id: string; revision_id: string; payload: CatalogRecord }[]; },
  };
}
