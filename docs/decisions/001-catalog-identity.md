# M1 identity and field rules

Recorded and approved by the owner September 19, 2026. Translations, reprints, and modest rules updates share a game ID with separate edition IDs; substantial independently playable redesigns receive a separate game ID linked to the original. Ambiguous cases require a documented maintainer decision. This policy approval does not approve any real-world merge or import.

A game ID identifies a design. A translation, publisher reprint, or modest rules update can use another edition of that game. A substantial independently playable redesign gets another game ID and a `reimplementation_of` relationship. Ambiguous cases need a maintainer's documented decision; neither title matching nor external-ID matching automatically merges records.

| Synthetic example | Contract representation |
| --- | --- |
| `007`, also called `Double Seven` | One UUID game with an alternate name; legacy `007` and an external ID `0007` remain strings |
| English and French printings | Two edition UUIDs referring to the same game UUID |
| `1812`, a separately playable redesign | Another game, linked with `reimplementation_of` |
| `Extra Seven`, requiring `007` | An expansion game with `expands`; its edition has a `with_base_game` play context |
| `Seven Alone`, playable alone or with `007` | A standalone expansion; standalone specifications remain distinct from expansion context |
| Two records called `007` | Separate identities until reviewed; a merge creates a tombstone and updates dependent references |
| An unidentified publication | A game with no default edition and explicitly unknown facts |

Play counts, duration, and age belong to edition play specifications. Summary fields use only the selected default edition's standalone specification. Contextual expansion counts never become standalone counts. Symmetric compatibility is stored on the smaller UUID; readers must derive its inverse. Game compatibility points to games, and edition compatibility points to editions.

All record objects reject unknown fields. Scalar unknowns are `null`; empty arrays mean no assertions recorded. Player counts are sorted, unique positive integers, or an explicit open upper bound. Duration may have one known bound, but an entirely unknown duration is `null`. Years use signed integers from -9999 to 9999, with -1 denoting 1 BCE and no year zero. Approximate dates remain unknown with field notes. Language tags use BCP 47 validation.

New citations reject BoardGameGeek URLs. Retaining an existing namespaced external identifier does not trigger a fetch. Sources are immutable; evidence uses JSON Pointer paths into a revision payload. Assessment records require attribution, a rubric version, a date, and a rationale; the fixture rubric is synthetic and not a production editorial standard. Personal ratings, ownership, and play history are excluded from catalog schemas.

The shared Zod contracts check individual shapes; the domain validator checks the complete candidate graph. SQL foreign keys bind entity types and revision ownership. Each layer is necessary: generated JSON Schema cannot express all cross-field or graph rules.
