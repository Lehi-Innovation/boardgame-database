import { CatalogRecord, Source, type ActiveRecord } from '@catalog/contracts';

// Synthetic data only. IDs are fixed so identity and merge expectations stay reviewable.
export const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
const base = { schema_version: 1 as const, state: 'active' as const, field_notes: [] };

export function game(n: number, overrides: Partial<Extract<ActiveRecord, { entity_type: 'game' }>> = {}) {
  return CatalogRecord.parse({
    ...base, id: id(n), entity_type: 'game', kind: 'base_game', name: `Example ${n}`,
    aliases: [], description: null, first_published_year: null, designers: [], mechanics: [], themes: [], styles: [], families: [],
    default_edition_id: null, identifiers: [], relationships: [], ...overrides,
  }) as Extract<ActiveRecord, { entity_type: 'game' }>;
}
export function edition(n: number, owner: number, overrides: Partial<Extract<ActiveRecord, { entity_type: 'edition' }>> = {}) {
  return CatalogRecord.parse({
    ...base, id: id(n), entity_type: 'edition', game_id: id(owner), name: 'English edition', aliases: [],
    publication_year: null, languages: ['en'], publishers: [], artists: [], identifiers: [], compatible_with: [],
    play_specifications: [{ context: { kind: 'standalone' }, player_support: { kind: 'exact', counts: [1, 2, 4] }, playtime_minutes: { min: 20, max: 45 }, min_age: null }],
    ...overrides,
  }) as Extract<ActiveRecord, { entity_type: 'edition' }>;
}
export function catalogFixture(): CatalogRecord[] {
  return [
    game(1, { name: '007', aliases: [{ name: 'Double Seven', language: 'en' }], default_edition_id: id(101), designers: [id(10)], mechanics: [id(12)], families: [id(13)], identifiers: [{ namespace: 'bgg', value: '0007' }] }),
    game(2, { name: '1812', first_published_year: -200, relationships: [{ kind: 'reimplementation_of', target_id: id(1) }] }),
    game(3, { name: 'Extra Seven', kind: 'expansion', relationships: [{ kind: 'expands', target_id: id(1) }], default_edition_id: id(103) }),
    game(4, { name: 'Seven Alone', kind: 'standalone_expansion', relationships: [{ kind: 'expands', target_id: id(1) }], default_edition_id: id(104) }),
    game(5, { name: '007' }), // Matching names do not merge identities automatically.
    game(6, { name: 'Unidentified game', field_notes: [{ path: '/first_published_year', kind: 'unknown', note: 'No publication evidence yet.' }] }),
    CatalogRecord.parse({ ...base, id: id(10), entity_type: 'person', name: 'Example Designer', aliases: [] }),
    CatalogRecord.parse({ ...base, id: id(11), entity_type: 'organization', name: 'Example Publisher', aliases: [] }),
    CatalogRecord.parse({ ...base, id: id(12), entity_type: 'taxonomy', vocabulary: 'mechanic', label: 'Drafting', definition: 'Choose from a shared selection.', retired: false, replacement_id: null }),
    CatalogRecord.parse({ ...base, id: id(13), entity_type: 'family', name: 'Seven family', aliases: [], description: null }),
    edition(101, 1, { publishers: [id(11)], compatible_with: [id(102)] }),
    edition(102, 1, { name: 'French edition', languages: ['fr'], publishers: [id(11)] }),
    edition(103, 3, { play_specifications: [{ context: { kind: 'with_base_game', base_game_id: id(1) }, player_support: { kind: 'at_least', min: 2 }, playtime_minutes: null, min_age: null }] }),
    edition(104, 4),
    CatalogRecord.parse({ ...base, id: id(20), entity_type: 'assessment', subject_id: id(1), subject_type: 'game', rubric: { key: 'complexity', version: 'pilot-1' }, author: 'Example Reviewer', assessed_on: '2026-09-18', value: 2, rationale: 'Synthetic assessment for a contract test.' }),
  ];
}
export const sourceFixture = Source.parse({
  id: id(900), url: 'https://publisher.example/rules/007', title: 'Example rulebook', publisher: 'Example Publisher',
  source_type: 'rulebook', accessed_on: '2026-09-18', locator: 'Page 2',
});
