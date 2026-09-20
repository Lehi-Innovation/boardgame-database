import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CatalogRecord } from '@catalog/contracts';
import { checkSubmission, referencesOf, standaloneSpecs, validateCatalog, validateProposal } from '@catalog/domain';
import { ProposalContent } from '@catalog/contracts';
import { catalogFixture, edition, game, id, sourceFixture } from './fixtures/catalog.js';

test('complete fixture graph permits aliases, editions, expansions, and duplicate titles', () => {
  assert.deepEqual(validateCatalog(catalogFixture()), []);
});
test('default edition must exist and belong to its game', () => {
  assert.ok(validateCatalog([game(1, { default_edition_id: id(101) })]).some(f => f.code === 'missing_reference'));
  assert.ok(validateCatalog([game(1, { default_edition_id: id(101) }), game(2), edition(101, 2)]).some(f => f.code === 'edition_owner'));
});
test('references are typed and taxonomy vocabulary is distinct', () => {
  assert.ok(validateCatalog([game(1, { designers: [id(2)] }), game(2)]).some(f => f.code === 'reference_type'));
  const records = catalogFixture();
  const first = game(1, { themes: [id(12)] });
  assert.ok(validateCatalog(records.map(record => record.id === first.id ? first : record)).some(f => f.code === 'taxonomy_vocabulary'));
});
test('expansion contexts cannot become standalone summary facts', () => {
  const record = edition(101, 1, { play_specifications: [{ context: { kind: 'with_base_game', base_game_id: id(2) }, player_support: { kind: 'exact', counts: [2, 3] }, playtime_minutes: { min: 10, max: 20 }, min_age: 8 }] });
  assert.deepEqual(standaloneSpecs(record), { player_support: null, playtime_minutes: null, min_age: null });
  assert.ok(validateCatalog([game(1, { kind: 'expansion' }), edition(101, 1)]).some(f => f.code === 'expansion_standalone'));
  assert.ok(validateCatalog([game(1), game(2), record]).some(f => f.code === 'unsupported_context'));
});
test('compatibility is stored once in stable UUID order', () => {
  assert.deepEqual(validateCatalog([game(1, { relationships: [{ kind: 'compatible_with', target_id: id(2) }] }), game(2)]), []);
  assert.ok(validateCatalog([game(1), game(2, { relationships: [{ kind: 'compatible_with', target_id: id(1) }] })]).some(f => f.code === 'compatibility_order'));
});
test('merges preserve both IDs and require references to be updated', () => {
  const merged = CatalogRecord.parse({ schema_version: 1, id: id(2), entity_type: 'game', state: 'merged', canonical_id: id(1), reason: 'Reviewed duplicate' });
  assert.deepEqual(validateCatalog([game(1), merged]), []);
  assert.ok(validateCatalog([game(1), merged, edition(101, 2)]).some(f => f.code === 'merged_reference'));
  const cycle = CatalogRecord.parse({ ...merged, id: id(1), canonical_id: id(2) });
  assert.ok(validateCatalog([cycle, merged]).some(f => f.code === 'merge_cycle'));
  assert.ok(validateCatalog([merged]).some(f => f.code === 'missing_reference'));
});
test('external identifier claims are unique across game and edition scope', () => {
  const identifiers = [{ namespace: 'example', value: '007' }];
  assert.ok(validateCatalog([game(1, { identifiers }), edition(101, 1, { identifiers })]).some(f => f.code === 'identifier_claim'));
});
test('proposal graph resolves jointly introduced entities and checks evidence locators', () => {
  const content = { title: 'Introduce game and edition', rationale: 'Synthetic import', origin: 'import', sources: [sourceFixture], targets: [game(1, { default_edition_id: id(101) }), edition(101, 1)].map(payload => ({ entity_id: payload.id, base_revision_id: null, payload, evidence: [{ path: '/name', source_id: sourceFixture.id, note: null }] })) };
  assert.deepEqual(validateProposal(content, []), []);
  const broken = structuredClone(content);
  broken.targets[0]!.evidence[0]!.path = '/nonexistent';
  broken.targets[0]!.evidence[0]!.source_id = id(999);
  assert.deepEqual(validateProposal(broken, []).map(f => f.code).sort(), ['evidence_path', 'missing_source']);
});
test('reference extraction includes edition play context and stable credit identities', () => {
  const records = catalogFixture();
  const expansionEdition = records.find(record => record.id === id(103))!;
  assert.deepEqual(referencesOf(expansionEdition).map(ref => [ref.relation, ref.target_id]), [['edition_of', id(3)], ['play_context', id(1)]]);
});

test('changed player counts require evidence on the precise fact, including removals', () => {
  const before=edition(101,1), after=structuredClone(before);
  after.play_specifications[0]!.player_support={kind:'exact',counts:[2,3,4]};
  const proposal=ProposalContent.parse({title:'Correct counts',rationale:'Source supports the correction.',origin:'human',sources:[sourceFixture],targets:[{entity_id:after.id,base_revision_id:id(1001),payload:after,evidence:[{path:'/name',source_id:sourceFixture.id,note:null}]}]});
  assert.ok(checkSubmission(proposal,[game(1),before],[]).errors.some(error=>error.code==='evidence_required'));
  proposal.targets[0]!.evidence[0]!.path='/play_specifications/0/player_support';
  assert.deepEqual(checkSubmission(proposal,[game(1),before],[]).errors,[]);
  after.play_specifications[0]!.player_support=null;
  proposal.targets[0]!.payload=after; proposal.targets[0]!.evidence=[];
  assert.ok(checkSubmission(proposal,[game(1),before],[]).errors.some(error=>error.code==='evidence_required'));
  after.field_notes=[{path:'/play_specifications/0/player_support',kind:'unknown',note:'The existing claim cannot be established.'}];
  assert.deepEqual(checkSubmission(proposal,[game(1),before],[]).errors,[]);
});
test('duplicate names are reviewable warnings and do not silently merge identities', () => {
  const next=game(2,{name:'Shared name'});
  const proposal=ProposalContent.parse({title:'Add game',rationale:'Distinct design.',origin:'ai',sources:[sourceFixture],targets:[{entity_id:next.id,base_revision_id:null,payload:next,evidence:[{path:'/name',source_id:sourceFixture.id,note:null}]}]});
  const result=checkSubmission(proposal,[game(1,{name:'Shared name'})],[]);
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.warnings.map(warning=>warning.code),['possible_duplicate','human_review_required']);
});
test('merge tombstones use their documented identity decision without citing removed fields', () => {
  const merged=CatalogRecord.parse({schema_version:1,id:id(2),entity_type:'game',state:'merged',canonical_id:id(1),reason:'Maintainer established duplicate design identity.'});
  const proposal=ProposalContent.parse({title:'Merge duplicate identity',rationale:'The two entries describe the same design.',origin:'human',sources:[],targets:[{entity_id:id(2),base_revision_id:id(1002),payload:merged,evidence:[]}]});
  assert.deepEqual(checkSubmission(proposal,[game(1),game(2)],[]).errors,[]);
  assert.ok(checkSubmission(proposal,[game(1),game(2),edition(101,2)],[]).errors.some(error=>error.code==='merged_reference'));
});
