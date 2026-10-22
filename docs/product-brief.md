# Board Game Database: product direction

Updated: 2026-10-21. Captures the owner's onboarding decisions. The proposals below are working hypotheses, not approved implementations or a fixed roadmap.

## Purpose and audience

Build an approachable alternative to BoardGameGeek that helps people discover games they are likely to enjoy, including hidden gems with limited broad popularity. The catalog should eventually be comprehensive, trustworthy, and continually growing.

The audience includes people who do not follow board game media or know hobby terminology. Enthusiasm and willingness to play complex games vary widely. Welcoming presentation should make the full range of games understandable, including demanding games.

Success means people actually discover and try games that suit them, alongside increasing catalog coverage and reliable information. A large record count or a consensus ranking alone does not establish success.

## Confirmed product decisions

- Mobile is the primary context: casual browsing and choosing games at the table. Visual browsing is preferred; desktop remains useful.
- Initial coverage includes modern hobby games, familiar mass-market games, children's games, and traditional board and card games. English-language availability is the initial focus; additional languages are a much later concern.
- Discovery should emphasize desired experiences and occasions. Starting examples include laughing together, solving a mystery, enjoying time with children, and working through a satisfying puzzle.
- Familiar games such as Monopoly and Clue can provide accessible starting points for discovering unfamiliar games.
- Recommendations should accommodate different tastes and surface niche matches. Popularity and frequency of award or reviewer nominations are useful signals, but should not dominate discovery or catalog priorities.
- Reviewers with similar tastes can be valuable guides. Shut Up & Sit Down and Actual LOL are personally trusted by the owner; their preferences should not become a universal standard for every visitor.
- The existing rating and genre system is the owner's invention and is open to substantial challenge and revision. Its goal is to convey the expected experience as intuitively as movie genres, extending beyond mechanics terminology.
- AI estimates are useful starting points. The owner prefers useful provisional information over pervasive blanks, with an easy path for people to flag errors and suggest improvements.
- Community suggestions for games and corrections are central. Contributions should feed a curated catalog with high-quality information.
- The owner can initially provide editing or quality review. Routine work should eventually move to trusted contributors, with a flexible review model that does not depend on the owner's continual availability.
- The current YAML architecture may change. No replacement platform has been selected.

## Owner context and working preferences

The owner's interests span party games, family games, and demanding games such as Nemesis and Root, with interest in even more complex games. They enjoy finding excellent games and introducing them to friends who do not consume board game content.

Real settings include three close friends, groups of roughly twelve, thirty-minute games with children, sessions around three and a half hours, and a sixteen-person cabin retreat. These are useful research and testing contexts, not limits on the intended audience.

Take initiative and keep work moving while the owner is busy. Use ordinary cost discipline; there is no fixed deadline or numerical budget yet. Personal affinity and hotness values still require the owner's input; permission to estimate game characteristics does not authorize inventing personal opinions.

## Working product hypotheses

These are proposed directions to test, rather than additional owner requirements:

1. **Describe independent aspects of an experience.** Separate rules burden, mental effort, interaction, competition, pace, and emotional qualities. A game can have simple rules, a satisfying logical puzzle, and low conflict at the same time. The current single `feel` scale mixes modes of play and intensity; it deserves revision before becoming a recommendation score.
2. **Let experiences overlap.** Use a small, accessible set of browsing categories with richer attributes underneath. Do not force every game into one genre or infer taste from demographic stereotypes.
3. **Explain familiar-game connections.** Identify what someone enjoys about a familiar game, such as deduction or negotiation, and explain why a suggested game shares that appeal. Familiarity alone does not establish that they like the game.
4. **Distinguish errors from differences in taste.** Correct factual mistakes through sourced edits. Preserve differing reactions to subjective qualities as feedback that can improve recommendations for different audiences.
5. **Make contributions reviewable.** A possible workflow is suggestion, evidence, proposed change, review, and publication, with history and reversal. Start with owner review and allow trusted contributors to take on routine decisions later. Accounts, permissions, and automation thresholds remain undecided.
6. **Track evidence and confidence.** Distinguish confirmed facts, AI estimates, and personal feedback. Capture sources and review status so corrections improve both individual entries and future research practices.
7. **Evaluate fit as well as coverage.** Candidate measures include whether descriptions set accurate expectations, whether people enjoyed discovered games, coverage across different play situations, and whether useful corrections get resolved. Specific metrics are not yet selected.

## BoardGameGeek source policy

The owner is flexible about using BoardGameGeek. The earlier blanket restriction arose from intellectual-property concerns, rather than a permanent objection to consulting BGG. Openness to use is not confirmation that a proposed use is permitted.

Policy check on 2026-10-21: official pages were available through search-indexed text; direct page fetches returned HTTP 403. The indexed material indicates:

- The [XML API terms](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use) limit the default grant to noncommercial use, restrict modification of retrieved data, and require attribution.
- The [API usage policy](https://boardgamegeek.com/using_the_xml_api) requires registration for most API uses and says applications considered competitive may be denied or have permission withdrawn. Commercial use requires a suitable license.
- The [site terms](https://boardgamegeek.com/terms) include restrictions on AI/LLM data use and unauthorized commercial uses, including uses BGG considers competitive.

These restrictions make permission for this project's intended use unresolved. This is a planning assessment, not a legal determination. Recheck the applicable terms and establish permission before adopting a BGG-dependent import or AI workflow. Continue independent research through publisher materials and other suitable sources in the meantime. The [research workflow](research.md) reflects that working policy, and the unused BGG importer is [archived](../archive/2026-10-22/README.md). Policy-document inspection is separate from importing game data.

## Open decisions and implementation status

Branding, business model, precise launch coverage, recommendation algorithms, contributor permissions, and hosting remain open. They need not all be decided before useful work begins.

The dated repository baseline, known defects, and proposed next work are maintained in [status.md](status.md). File placement and maintenance conventions are in [organization.md](organization.md).
