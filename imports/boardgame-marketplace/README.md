# Marketplace pilot identity review

The twenty titles below come from the consumer development seeds, not live inventory.
The original manifest retains its **pending** mappings and null edition IDs.
A separate [cover review packet](cover-review/README.md) now prepares all twenty
game identities and proposes eighteen representative editions, with Gloomhaven
and The Castles of Burgundy still unresolved. These are unapproved drafts;
preserve both the original reserved IDs and the new proposed edition IDs during
review. No original mapping has been adopted or merged by this research.

The [manifest](manifest.json) pins seed provenance and each legacy file hash. See the [importer guide](../../docs/pilot-import.md) for reports and preparation commands. Existing BGG IDs are retained as string clues in the manifest; they are not fetched or asserted as catalog identifiers.

| Candidate / legacy file | Proposed game UUID | Identity question |
| --- | --- | --- |
| [Wingspan](../../games/wingspan.yaml) | `506babbd-94e8-4695-ae38-e43b8f78325e` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Terraforming Mars](../../games/terraforming-mars.yaml) | `81f2248a-27d2-4e5d-9be9-2397e0cb9f84` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Gloomhaven](../../games/gloomhaven.yaml) | `65eccf26-21ae-4f96-86e6-419438b70a21` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Azul](../../games/azul.yaml) | `7ada73dd-9aa9-4292-a59a-fd25256708f2` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Scythe](../../games/scythe.yaml) | `2b222331-6108-4215-8458-f3696e1aa26b` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Brass: Birmingham](../../games/brass-birmingham.yaml) | `9d96a662-7e4b-4899-b7d8-9310e882b377` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Spirit Island](../../games/spirit-island.yaml) | `bd65e613-5a00-48e0-9527-bd16bba505da` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Everdell](../../games/everdell.yaml) | `8a80f5ea-1aee-4d12-a694-a5eb02c1e88c` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Viticulture Essential Edition](../../games/viticulture-essential-edition.yaml) | `7d0cb483-e063-4bf4-bdcc-704c99e5c62b` | Compare with viticulture.yaml under the approved modest-update versus substantial-redesign rule; the edition label alone does not decide game identity. |
| [7 Wonders](../../games/7-wonders.yaml) | `8dc0a117-2726-4f1a-acee-d70020170e10` | Compare with 7-wonders-second-edition.yaml. Establish whether the consumer seed identifies the design or a particular edition; do not assign printing facts from the title. |
| [Dominion](../../games/dominion.yaml) | `61a60472-7ba2-4180-9d92-2e6bbc3838e2` | Compare with dominion-second-edition.yaml; distinguish design identity from first/second edition card sets before selecting summary facts. |
| [Splendor](../../games/splendor.yaml) | `254a0b1c-d50d-4c8b-a5dc-72825d0fd565` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Codenames](../../games/codenames.yaml) | `9edeaa3a-038d-4875-a5e5-cc825b0ac4df` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [The Castles of Burgundy](../../games/the-castles-of-burgundy.yaml) | `60433ca5-c2ab-45b6-a6ca-6de9047ba81e` | Resolve the publication/edition used for basic details before selecting an edition; a matching title is only a candidate link. |
| [Ticket to Ride](../../games/ticket-to-ride.yaml) | `a6b66495-fa9e-40f5-8244-7d3dd24bc1ae` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Pandemic](../../games/pandemic.yaml) | `f624bcd1-c084-4c06-b90d-3b9e6775f2de` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Catan](../../games/catan.yaml) | `18b3637a-9b38-4055-bf7b-5c3dc25c2e23` | Review the alternate names and publisher/printing context. Keep the edition unknown until supported; aliases do not establish physical editions. |
| [Carcassonne](../../games/carcassonne.yaml) | `f4fe327d-626c-48ce-ba98-94dfa2072e01` | Matching seed title and legacy filename identify a candidate only. Verify design identity and edition context against allowed sources before preparing facts. |
| [Pandemic Legacy: Season 1](../../games/pandemic-legacy-season-1.yaml) | `385a3718-efb5-4d6a-bd70-bbf83ca7d8ed` | Compare Pandemic, Season 1, and Season 2 using allowed publisher/rulebook evidence. Do not infer expansion or reimplementation links from the shared name. |
| [Pandemic Legacy: Season 2](../../games/pandemic-legacy-season-2.yaml) | `3d5ce0f6-0b8f-473c-ae14-351912f014b0` | Compare Pandemic, Season 1, and Season 2 using allowed publisher/rulebook evidence. Do not infer expansion or reimplementation links from the shared name. |

All twenty seed titles have a matching legacy filename. This is candidate coverage only. The report keeps edition labels, family/base/expansion links, aliases, credit/category strings, and raw basic details available for review. It makes no factual conversion.

Expand beyond these twenty toward the architectural pilot after the first sourced batch is reviewed. Required additional cases include numeric-only titles, localized aliases, multiple editions, ordinary and standalone expansions, a reviewed duplicate merge, and unknown/disputed facts.

Regenerate the complete offline report with:

```sh
npm run import:legacy -- plan --output /tmp/catalog-pilot-report.json
```
