# Discovery review: 2026-11-01

This began as a representative source and technical review. The dated owner
vocabulary check below adds initial human evidence, but broader usability and
post-play fit research are still outstanding. It does not verify every field in
every record. The sample spans the intended
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

Additional researched records close concrete gaps: original 878 Vikings resolves
the missing historical evidence ID, and original Clank! Legacy adds a sourced campaign
game. Subsequent pixel inspection found that its apparent cover actually represented
the sequel; the misnamed asset is quarantined and a separately sourced original-game cover is active. Experience ratings, evokes, and suggested counts
remain provisional estimates. Unknown first-edition facts remain unknown.

The exclusion review added Mū Tōrere and Nine Men's Morris on 2026-11-02 from
Digital Ludeme Project, museum and independent rules evidence. Their old failed
notes treated traditional status or lack of manufactured packaging as a barrier.
Traditional games are explicitly within scope. Both now have separate records,
two-player counts, explained rule variants, unknown publication/age fields and
provisional duration/experience estimates. The original exclusion reasons remain
in CSV notes and the dated decision record.

Additional source reviews corrected the earlier Leinen los! record to Alex
Randolph’s HABA dexterity boat race, rather than an unsupported modern dice game.
The jury confirms 2–4, 6+ and about ten minutes; the independent Luding catalog
distinguishes its 1996 publication from the 1997 children’s award. This adds a
more accurate children’s-game option without creating a duplicate record.

Further targeted review distinguishes team competition in Présages from universal
cooperation, and competitive rescue attempts in Save Doctor Lucky from a shared
victory. The latter needs a witness to see the rescue. MIND MGMT now includes the
publisher’s app-based solo/cooperative support, and original That’s Life! includes
the supported sixth player. These factual corrections improve discovery filters;
preferred counts and experience judgments remain provisional.

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

### Owner vocabulary check: 2026-11-02

The owner answered an open-ended question about which games they would expect
under each label. These are their supplied examples, not invented play outcomes
or personal ratings:

| Label | Owner's examples | Current tag/filter check before correction |
| --- | --- | --- |
| Share a laugh | Camel Up | Present through `Humor` |
| Solve a mystery | Sherlock Holmes: Consulting Detective; Mysterium | Both present through `Mystery` |
| Work through a puzzle | Pandemic; Forbidden Island | Both absent from `Clever` despite their planning and coordination |

The real SQLite query path reproduced those results: three of the five supplied
examples appeared under their expected shortcut. Pandemic and Forbidden Island's
provisional five-tag sets now emphasize `Clever` in place of `Dread`. This is a
curation judgment informed by the owner's expectations, not an owner-supplied
affinity/hotness rating or a claim that tension is absent. The remaining tags and
the schema's preset definitions are unchanged. After rebuilding, a read-only
Chromium check at 390 pixels verified all five examples through the actual
shortcut buttons and query responses, with no page errors or horizontal overflow.
This confirms that the supplied examples are discoverable; it is not broad
recommendation, post-play fit or usability validation.

The Sherlock example expresses an expected kind of experience, not an identified
printing owned by the user. Subsequent curation scopes its record to the original
English Sleuth game, with original solo/competitive/group modes distinguished from
later collections. A repeated phone check still finds all five examples; it does
not establish that the owner intended that particular edition.

A working interpretation is that shared unpredictable spectacle can fit laughter,
and that coordinated planning against a changing situation can fit a puzzle.
Those interpretations are inferences from the examples. The owner did not restrict
puzzles to cooperative games, laughter to party games, or mystery to either
strict deduction or open interpretation. Keep these overlaps available when
testing with more people and compare expectations after actual play.

## Mobile and workflow checks

`python -m tests.browser_smoke` uses a disposable two-game repository and real
Chromium at 390, 768, and 1280 pixels. It visits all four pages, checks horizontal
overflow and browser errors, uses an experience shortcut, checks its URL filter,
opens a game and submits a correction. A navigation overflow at 390 pixels was
found and fixed. The check prints full-page screenshot paths for inspection.

On 2026-11-02, a read-only browser check against the real catalog loaded all 13
active covers in cards and details at the same three widths (39 cases). It found
that cropped images hid the title and publisher mark on tall boxes such as
Codenames. Cards and both detail views now fit the whole box. All 39 cases passed
image decoding, whole-cover styling and horizontal-overflow checks without page
errors. The image manager also retains search text entered while its catalog is
loading, so early input is applied when the results arrive. Its cards and modal
details were checked at all three widths, including an intentionally delayed
catalog response. The four-page fixture smoke check was repeated after these fixes.

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
