import { z } from 'zod';

export const CONTRACT_VERSION = '0.3.0';
export const SCHEMA_VERSION = 1;
export const Id = z.uuid().regex(/^[0-9a-f-]+$/, 'Use canonical lowercase UUIDs');
export const Text = z.string().trim().min(1).max(10_000);
export const Name = z.string().trim().min(1).max(300);
export const Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const EntityType = z.enum(['game', 'edition', 'person', 'organization', 'taxonomy', 'family', 'assessment']);
export const FieldPath = z.string().max(500).regex(/^(\/(?:[^~\/]|~0|~1)+)+$/);
// Signed historical years: -1 means 1 BCE; there is no year zero.
export const Year = z.int().min(-9999).max(9999).refine(year => year !== 0).nullable();
const positive = z.int().positive().max(2_147_483_647);
const language = z.string().min(2).max(50).refine(value => {
  try { return Intl.getCanonicalLocales(value).length === 1; } catch { return false; }
}, 'Expected a BCP 47 language tag');

export const Alias = z.strictObject({ name: Name, language: language.nullable() });
export const Identifier = z.strictObject({
  namespace: z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/),
  value: z.string().min(1).max(300),
});
export const FieldNote = z.strictObject({
  path: FieldPath,
  kind: z.enum(['unknown', 'disputed', 'not_applicable']),
  note: Text,
});
export const PlayerSupport = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('exact'), counts: z.array(positive).min(1).max(1000)
    .refine(values => values.every((n, i) => i === 0 || n > values[i - 1]!), 'Counts must be unique and ascending') }),
  z.strictObject({ kind: z.literal('at_least'), min: positive }),
]);
export const Duration = z.strictObject({ min: positive.nullable(), max: positive.nullable() })
  .refine(value => value.min !== null || value.max !== null, 'Use null for wholly unknown duration')
  .refine(value => value.min === null || value.max === null || value.min <= value.max, 'Minimum exceeds maximum');
export const PlaySpecification = z.strictObject({
  context: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('standalone') }),
    z.strictObject({ kind: z.literal('with_base_game'), base_game_id: Id }),
  ]),
  player_support: PlayerSupport.nullable(),
  playtime_minutes: Duration.nullable(),
  min_age: positive.nullable(),
});
export const Relationship = z.strictObject({
  kind: z.enum(['expands', 'reimplementation_of', 'compatible_with']),
  target_id: Id,
});
const base = {
  schema_version: z.literal(SCHEMA_VERSION),
  id: Id,
  state: z.literal('active'),
  field_notes: z.array(FieldNote).max(100),
};
const named = { name: Name, aliases: z.array(Alias).max(100) };
const described = { ...named, description: Text.nullable() };

export const GameRecord = z.strictObject({
  ...base, ...described,
  entity_type: z.literal('game'),
  kind: z.enum(['base_game', 'expansion', 'standalone_expansion']),
  first_published_year: Year,
  designers: z.array(Id),
  mechanics: z.array(Id),
  themes: z.array(Id),
  styles: z.array(Id),
  families: z.array(Id),
  default_edition_id: Id.nullable(),
  identifiers: z.array(Identifier),
  relationships: z.array(Relationship),
});
export const EditionRecord = z.strictObject({
  ...base, ...named,
  entity_type: z.literal('edition'),
  game_id: Id,
  publication_year: Year,
  languages: z.array(language),
  publishers: z.array(Id),
  artists: z.array(Id),
  identifiers: z.array(Identifier),
  play_specifications: z.array(PlaySpecification).max(100),
  compatible_with: z.array(Id),
}).refine(record => {
  const contexts = record.play_specifications.map(spec => spec.context.kind === 'standalone' ? 'standalone' : spec.context.base_game_id);
  return new Set(contexts).size === contexts.length;
}, 'Only one specification per standalone or base-game context');
export const PersonRecord = z.strictObject({ ...base, ...named, entity_type: z.literal('person') });
export const OrganizationRecord = z.strictObject({ ...base, ...named, entity_type: z.literal('organization') });
export const FamilyRecord = z.strictObject({ ...base, ...described, entity_type: z.literal('family') });
export const TaxonomyRecord = z.strictObject({
  ...base,
  entity_type: z.literal('taxonomy'),
  vocabulary: z.enum(['mechanic', 'theme', 'style', 'assessment']),
  label: Name,
  definition: Text,
  retired: z.boolean(),
  replacement_id: Id.nullable(),
});
export const AssessmentRecord = z.strictObject({
  ...base,
  entity_type: z.literal('assessment'),
  subject_id: Id,
  subject_type: z.enum(['game', 'edition']),
  rubric: z.strictObject({ key: Name, version: Name }),
  author: Name,
  assessed_on: z.iso.date(),
  value: z.union([z.number(), Text, z.array(z.union([z.number(), Text])).min(1)]),
  rationale: Text,
});
export const ActiveRecord = z.discriminatedUnion('entity_type', [
  GameRecord, EditionRecord, PersonRecord, OrganizationRecord, TaxonomyRecord, FamilyRecord, AssessmentRecord,
]);
export const MergeRecord = z.strictObject({
  schema_version: z.literal(SCHEMA_VERSION),
  id: Id,
  entity_type: EntityType,
  state: z.literal('merged'),
  canonical_id: Id,
  reason: Text,
}).refine(record => record.id !== record.canonical_id, 'Cannot merge an entity into itself');
export const CatalogRecord = z.union([ActiveRecord, MergeRecord]);
export type CatalogRecord = z.infer<typeof CatalogRecord>;
export type ActiveRecord = z.infer<typeof ActiveRecord>;

export const Source = z.strictObject({
  id: Id,
  url: z.url().refine(value => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  }, 'Use an HTTP(S) source')
    .refine(value => {
      try {
        const host = new URL(value).hostname.toLowerCase().replace(/\.$/, '');
        return host !== 'boardgamegeek.com' && !host.endsWith('.boardgamegeek.com');
      } catch { return false; }
    }, 'Research from BoardGameGeek is not permitted'),
  title: Name,
  publisher: Name,
  source_type: z.enum(['publisher', 'rulebook', 'retailer', 'review', 'reference', 'other']),
  accessed_on: z.iso.date(),
  locator: Text.nullable(),
});
export const Evidence = z.strictObject({ path: FieldPath, source_id: Id, note: Text.nullable() });
export const ProposalTarget = z.strictObject({
  entity_id: Id,
  base_revision_id: Id.nullable(),
  payload: CatalogRecord,
  evidence: z.array(Evidence).max(500),
}).refine(target => target.entity_id === target.payload.id, 'Target and payload IDs must match');
export const ProposalContent = z.strictObject({
  title: Name,
  rationale: Text,
  origin: z.enum(['human', 'ai', 'import']),
  targets: z.array(ProposalTarget).min(1).max(100),
  sources: z.array(Source).max(500),
}).superRefine((content, ctx) => {
  for (const [label, values] of [
    ['targets', content.targets.map(target => target.entity_id)],
    ['sources', content.sources.map(source => source.id)],
  ] as const) {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', path: [label], message: 'Duplicate IDs' });
  }
});
// Identity/role comes from the server session, never from these request bodies.
export const SaveProposalCommand = z.strictObject({
  proposal_id: Id,
  expected_version: z.int().nonnegative(),
  content: ProposalContent,
});
export const SubmitProposalCommand = z.strictObject({ proposal_id: Id, expected_version: positive });
export const ReviewProposalCommand = z.strictObject({
  proposal_id: Id,
  expected_version: positive,
  submitted_hash: Hash,
  decision: z.enum(['approve', 'reject', 'request_changes']),
  reason: Text,
  idempotency_key: Id,
  validation_id: Id,
});
export const WithdrawProposalCommand = SubmitProposalCommand;
export const ValidateProposalCommand = SubmitProposalCommand;
export const CommentCommand = z.strictObject({ proposal_id: Id, body: Text });
export const ReportCommand = z.strictObject({
  report_id: Id, entity_id: Id.nullable(), body: Text, sources: z.array(Source).max(20),
});
// Intake preserves the contributor's words. No fact, URL, or citation parsing is
// required here; reviewed catalog proposals still use the stricter schemas above.
const ContributionText = z.string().max(10_000);
export const ContributionContent = z.strictObject({
  kind: z.enum(['game', 'correction', 'problem']),
  name: ContributionText.default(''),
  body: ContributionText.default(''),
  details: z.array(z.strictObject({
    category: z.enum(['notes', 'links', 'edition', 'play', 'credits', 'other']),
    text: ContributionText,
  })).max(20).default([]),
}).superRefine((content, ctx) => {
  const field = content.kind === 'game' ? 'name' : 'body';
  if (!content[field].trim()) ctx.addIssue({ code: 'custom', path: [field], message: field === 'name' ? 'Give us a game name.' : 'Tell us what you noticed.' });
});
export const SendContributionCommand = z.strictObject({ contribution_id: Id, content: ContributionContent });
export const TriageContributionCommand = z.strictObject({ contribution_id: Id, state: z.enum(['received', 'archived']) });
export const LegacyMapping = z.strictObject({
  source: z.literal('legacy_yaml'),
  legacy_id: z.string().min(1).max(300),
  entity_id: Id,
  source_hash: Hash,
});

export const GameSummary = z.strictObject({
  id: Id,
  revision_id: Id,
  name: Name,
  kind: GameRecord.shape.kind,
  first_published_year: Year,
  designers: z.array(z.strictObject({ id: Id, name: Name })),
  mechanics: z.array(z.strictObject({ id: Id, label: Name })),
  themes: z.array(z.strictObject({ id: Id, label: Name })),
  default_edition: z.strictObject({
    id: Id,
    name: Name,
    publication_year: Year,
    player_support: PlayerSupport.nullable(),
    playtime_minutes: Duration.nullable(),
    min_age: positive.nullable(),
  }).nullable(),
});
export const GameListResponse = z.strictObject({
  release_id: z.string().regex(/^r[0-9]{6,}$/),
  schema_version: z.literal(SCHEMA_VERSION),
  data: z.array(GameSummary),
  next_cursor: z.string().min(1).nullable(),
});

export const contractSchemas = {
  CatalogRecord, GameRecord, EditionRecord, Source, ProposalContent, SaveProposalCommand,
  SubmitProposalCommand, ReviewProposalCommand, WithdrawProposalCommand, ValidateProposalCommand,
  CommentCommand, ReportCommand, ContributionContent, SendContributionCommand, TriageContributionCommand,
  LegacyMapping, GameSummary, GameListResponse,
};
export { z };
