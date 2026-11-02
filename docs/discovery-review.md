# Discovery review: 2026-11-01

This is a representative source and technical review, not user usability research
or verification of every field in every record. The sample spans the intended
audiences without using nomination frequency as a quality measure. Consulted links
and precise limitations are recorded in `sources/research-log.yaml`.

| Audience/context | Record | Checked evidence and result |
| --- | --- | --- |
| Familiar mass-market | Monopoly | Hasbro C1009 confirms 2–8 players, age 8+, trading/building and bankruptcy; the original publication date and conflicting CSV date were not verified in this representative sample |
| Familiar mystery | Cluedo / Clue | Hasbro classic US rules confirm 3–6 players, age 8+, and private-card deduction; these do not cover all UK/international editions |
| Children | Outfoxed! | Gamewright page/rules confirm 2–4, 20 minutes, age 5+; corrected age 4 → 5 and added the credited illustrator |
| Traditional | Chess | FIDE laws confirm two opponents, 8×8 board, 16 pieces each and checkmate; removed a spuriously exact publication year and universal minimum age |
| Party | Just One | Repos confirms 3–7, 20 minutes, age 8+ and cooperative clue cancellation; the current refreshed edition's variant is not assumed to be original |
| Family/spatial puzzle | Cascadia | AEG confirms base-game 1–4, age 10+, 45 minutes and habitat/wildlife puzzle; six-player Landmarks counts do not replace base counts |
| Demanding/conflict | Root | Leder confirms 2–4, 60–90 minutes, age 14+ and different faction systems; corrected age 10 → 14 |

Follow-up identity research also corrected Das Bohnenspiel to a traditional two-player mancala, separated the 1990 Adel Verpflichtet and 2004 Hoity Toity editions, and distinguished several publication dates from award dates. These consulted sources and their limits are recorded separately in the evidence log and identity decisions.

Two additional researched records close concrete gaps: original 878 Vikings resolves
the missing historical evidence ID, and original Clank! Legacy links the pre-existing
cover to its represented game. Experience ratings, evokes, and suggested counts
remain provisional estimates. Unknown first-edition facts remain unknown.

## Experience vocabulary

Three schema-defined starting points now connect ordinary intentions to current
experience tags: “Share a laugh”, “Solve a mystery”, and “Work through a puzzle”.
They apply visible, editable, shareable filters. They do not rank games by popularity
or claim a recommendation model has been validated. Supported player counts and
suggested group sizes are separate controls, including exact groups above twelve.

Current limitations remain visible: `feel` combines solo/cooperative modes, party
atmosphere, and rivalry; a numeric interval is therefore not a pure intensity scale.
Rating labels now come from the schema everywhere, reducing inconsistent meanings.
Replacing `feel` with independent dimensions remains a proposal requiring testing.

## Mobile and workflow checks

`python -m tests.browser_smoke` uses a disposable two-game repository and real
Chromium at 390, 768, and 1280 pixels. It visits all four pages, checks horizontal
overflow and browser errors, uses an experience shortcut, checks its URL filter,
opens a game and submits a correction. A navigation overflow at 390 pixels was
found and fixed. The check prints full-page screenshot paths for inspection.

The isolated HTTP suite additionally checks a supported group of sixteen separately
from estimated preferred counts, complete YAML/SQLite payload equality, immediate
upload lookup, provenance, cross-origin write rejection, safe image paths, failed
build preservation, and cache refresh after rebuild. Its modified player count is
a fixture, not a claim about a real game.

These checks establish functional behavior. Next user research should ask people
to choose for a short session with children, an evening with close friends, a large
group, and a demanding evening; ask what they expect from the displayed experience
labels and compare those expectations after play. No successful-play outcome,
user preference, or owner rating has been invented from automated tests.
