# Catalog consistency and identity

The 2026-11-01 migration resolved the earlier 349 structural findings without claiming
a factual review of all games. The changes are inspectable in
`python -m scripts.reconcile_records` (preview) and `--apply` (validated application).
Running it after migration makes no further changes.

## Record changes

- Six numeric IDs are now quoted filename slugs, including `007`.
- Thirty-two null publisher fields are empty lists; no publisher was invented.
- Nineteen alternate-title lists now quote titles containing colons, preserving the
  original words rather than exposing accidental YAML mappings to consumers.
- Fifteen records normalize category synonyms or remove misplaced tags. `Lucky`,
  `Unique`, and `Discovery` belong to feelings; `Competitive` and `Strategy` repeated
  existing descriptions/ratings. Clear synonyms include `Race` → `Racing`,
  `Push Your Luck` → `Press Your Luck`, and `Solo/Solitaire` → `Solo`.
- Thirty-six evokes lists normalize misplaced mechanics/themes to experience
  estimates and repair two repeated values. These are provisional editorial
  estimates from existing descriptions, not new claims of community consensus or
  fresh publisher research. Per-game choices live in the migration script.

The schema now includes useful existing distinctions: memory, trivia, voting,
exploration, stock holding, solo, traditional, educational, creative, simulation,
and missing themes. This is a vocabulary extension; the proposed replacement of the
`feel` scale has not been adopted. All presentation labels derive from the schema. Later source-based corrections are separate from this structural migration, including traditional Das Bohnenspiel, Codenames counts/year, and distinct Adel Verpflichtet/Hoity Toity editions.

The previous player-count enumeration incorrectly rejected known counts over twelve.
Positive integer counts now remain exact, alongside the legacy open-ended `12+`
label. No game counts were reduced, rounded, or replaced with that label.

Owner affinity/hotness, play history, descriptions, unrelated text, and comments
were preserved by the migration. Game ratings are still provisional unless their
own evidence establishes otherwise. Schema validity does not certify factual quality.

## Catalog identity

`scripts/catalog.py` is the shared resolver used by Python progress, mapping backfill,
and the derived SQLite catalog snapshot consumed by the web tracker.

1. A current explicit CSV `yaml_id` mapping is authoritative. A missing explicit
   target fails resolution rather than falling back silently.
2. Excluded rows without mappings stay excluded, with their reasons visible.
3. Otherwise exact primary/alternate names, with a filename-slug fallback, identify
   candidates. Known CSV publication years must match the represented record year.
4. Multiple candidates or conflicting years remain pending. No subtitle-prefix
   guessing or last-record-wins matching is used.

Only identical identity/status/mapping rows collapse. Different years, source IDs,
types, exclusions, or mappings stay separate. All source CSV row numbers and notes
remain available in the snapshot. Empty `pending` is not a comprehensive-coverage
claim; excluded entries and detailed files without catalog matches are counted
separately. Source nominations enrich browsing and do not determine quality.

The JSON report includes candidate records and explicit publication-year warnings. Ten reviewed mapping corrections, with original targets and reasons, are retained in [../sources/catalog-identity-decisions.yaml](../sources/catalog-identity-decisions.yaml). Nine entries returned to pending; Dune’s 2019 row now links its 2019 edition.

Inspect `python scripts/progress.py --json` before resolving conflicts. Use explicit
edition evidence, not the goal of making counts increase, to choose corrections.
Keep both distinct editions. Backfill previews use these same conservative rules.

## Historical research IDs

[../sources/game-aliases.yaml](../sources/game-aliases.yaml) records the initial nineteen deliberate
links from historical IDs to current records, plus four retired duplicate-record IDs, each with an explanation grounded in
the stored evidence and represented edition. Historical log bytes remain intact.
The previously missing original 878 Vikings record was independently researched and
added using its historical slug; it is not an alias to the second edition.

Aliases do not establish that every logged source supports every field in its target
record. The audit validates targets and explanations and reports unresolved historical
IDs; it never rewrites evidence IDs automatically.

## Reviewed duplicate records

On 2026-11-02, standard `two-player-chess` was consolidated into `chess`, and
`the-castle-carcassonne` into `carcassonne-the-castle`. Both original YAML files are
[archived unchanged](../archive/2026-11-02/README.md), with hashes and restoration
requirements. Their protected owner fields were empty; no plays or personal
ratings were merged or discarded. Differing provisional ratings remain historical
in the archive. The retained records preserve the useful alternate titles.

The same-title CSV row **The Castle (board game)** identifies a separate 1981
Mayfair game. Its wrong Carcassonne mapping was cleared rather than counted as a
duplicate. Faidutti and Laget’s 2000 **Castle** also remains separate and now has
creator-sourced identity and credits. These decisions demonstrate why comparing
only the duplicate YAML titles is insufficient: inspect the original CSV identity
and underlying evidence before assigning its target.

The same review later consolidated `hannibal` into `hannibal-rome-vs-carthage`.
Both explicitly represented Avalon Hill's 1996 original; the publisher's product-906
advertisement and contemporary independent play review corroborate it. The retired
short-title YAML remains unchanged with its hash in the dated archive. Both catalog
title variants map to the retained original; later Valley Games/PHALANX revisions
are not silently combined with it.

San Juan demonstrates the different outcome for real editions: the original
110-card game (2004) and Ravensburger's second edition (2014, with additional
buildings) remain separate. The undated plain-title CSV row stays pending because
both legitimately share that name; explicit dated rows cover the two editions.
An external discovery identifier alone was not treated as proof of its edition.

## Families and distinct commercial titles

The same review preserved Borg's Milton Bradley **Liar's Dice (1987)**, German
F.X. Schmid **Bluff (1993)** and English **Call My Bluff (1997)** separately.
The historical `call-my-bluff-1993` evidence alias now points to `bluff-1993`;
the original notes describe the German award game, not the later English box.
Original log bytes remain intact. Traditional Dudo was not assigned Borg's
commercial designer/date merely because the bidding resembles it.

Parker **Focus (1980)** and Milton Bradley **Domination (1982)** also remain
separate. The undated Focus catalog row still lacks edition evidence; a dated
Parker row covers the corrected record. **Aggravation** represents CO-5's 1962
four-player set, while **Wahoo** represents traditional marble-racing variants.
Maker names and board limits are not universal rules for every Wahoo set.

Two category-level YAMLs, `tiger-game` and
`third-reich-great-pacific-war-series`, are now [archived unchanged](../archive/2026-11-02/README.md)
as family overviews. Their dates, player counts and ratings did not identify
one playable game. The latter also blended separate publishers' game lines;
both family discovery rows are explained `skip` entries. Neither retired ID had historical
evidence entries or owner history, and neither redirects to an arbitrary member.
Specific Bagh-Chal and Advanced Third Reich remain active. This is an entity-scope
correction, not evidence that every game within either family has been researched.

Other reviewed rethemes remain separate as well: original Jactalea **Kamon (2007)**
uses symbol quantities while Cosmoludo's **2020** revision uses colors; original
AMIGO **Pirat (1992)** has its own 66-card/two-to-five-player rules, separate from
Heidelberger **Korsar (2002)** and its extra partnership seats. **Auf Heller und
Pfennig (1994)** represents the German marketplace, while **Kingdoms (2002)**
represents FFG's fantasy retheme. The consulted German market-game rules are a
©1995 reprint; they do not establish an original 1995 release. Dated rows identify
the appropriate record without inventing external discovery IDs.

Unrelated same-title games also remain separate: **Labyrinth (1986)** is Kobbert's
Ravensburger maze, while **Labyrinth: The War on Terror (2010)** is Ruhnke's GMT
simulation. The latter has its own record, supported by the original playbook and
a contemporary played review; the publisher's linked 2011 second-edition rules
are identified as a revision. **London (2010)** retains Treefrog's borough map;
**London (Second Edition, 2017)** separately represents Osprey's borough cards and
revised rules. A dated original-edition row covers the former without assigning
the latter's age, timing or components to it.

Some previous records described unsupported games rather than verified editions.
Lemming, Life Style, Liftoff!, Light Division, Lingua, Livequiz, Looot and Lure now
identify the sourced games under their existing IDs. The unsupported old publisher,
year and mechanism combinations were not turned into additional invented records.
The already separate 2018 `lift-off` record remains distinct from Task Force's
1989 `liftoff`. Unknown original labels stay unknown: for example, Dutch Livequiz's
current answer-service availability and Liftoff!'s original duration remain
unverified. Museum evidence identifies Luftwaffe as Avalon Hill/Lou Zocchi (1971),
correcting its CSV date and false designer credit.

**Marvel Heroes (2006)** now separately represents Nexus's superhero-team game
distributed by Fantasy Flight, rather than the older Milton Bradley title.
Original rule credits distinguish design, additional design/development, board
art and sculpture. **Lord of the Rings (2000)** is Knizia's original cooperative
Hasbro/Wizards game, with its own record; The Confrontation and the children's
game remain distinct. The consulted FFG rulebook explicitly belongs to the 2010
revision, while creator history and a contemporary played review establish the
original game.

Original Lifestyle **Macroscope (2016)** and Mayday's **English 2017** issue also
have separate records/dated rows. The original's first language and printing
remain unverified. **Maple Valley** illustrates why availability evidence is
not enough to identify every later reference: final English rules and a finished
Kickstarter-copy review establish 2023, but the generic 2024 row supplies no
language or printing. It stays pending, with an explicit 2023 row for the
represented game. Its shared celebration is competitively scored; the earlier
cooperative `feel` value was incorrect.

The retired `citadel` YAML also explicitly described Faidutti’s **Citadels**, with
incorrect and blended credits/specifications. It is archived unchanged and aliases
to the retained `citadels` record. That record now represents French Multisim’s
original **2000** game (3–7); the French rule mirror labels its two-player appendix
as a later German-edition variant. Original art credits are retained by role.
The singular **Citadel** discovery row instead explicitly maps to the unrelated
**FGU 1976** tower quest by Goodman, with Krenkel art. Historical filenames cannot
establish the identity of an unqualified CSV title.

**Machiavelli (1977)** is Battleline’s Renaissance negotiation game, separate from
the localized Citadels title. **Marco Polo (1983)** is Schmidt’s Kremer design,
with spinner travel and trading, separate from the later dice-placement games.
Its inspected German rules do not establish the Spanish CEFA edition’s artist.

Dated **Mr. President** rows distinguish **3M’s 1967 standard revision** from
**GMT’s 2023 solo simulation**. The former follows actual 1965/66 versions; the
consulted early-rules transcription is not called the 1967 manual. Its historical
`presidential-campaign` ID stays stable, while the unverified commercial-title row
is explicitly ambiguous. The undated Mr. President row remains pending rather
than selecting either namesake. GMT’s current second-edition manuals do not
certify original labels or fixed session bounds.

**New Phone Who Dis? (2019)** separates actual adult-game availability from the
2018 trademark application and consulted 2020 instruction reprint. Supported 3+
uses the schema’s open-ended count convention; neither the family nor second
edition is blended into it. **The Night Cage** has an explicit original **2021**
row supported by rules and contemporary played copies; the generic 2022 row
remains pending without edition evidence. Its corrected artist is Chris Chan;
Curt Covert’s credit is additional development.

HABA’s **Orchard (1986)** now has its own record, separate from both
**First Orchard (2009)** and **Tuck’s solitaire Orchard**. The classic’s publisher
history identifies September 1986 first distribution. Its consulted legacy English
3103 rules support 2–8, while later 1–8 rule issues are distinguished. The original
First Orchard 4655 manual supports solo or cooperative play and changes the raven
puzzle into a path, with a one-fruit basket result instead of two. Its old 1986 date
was wrong; its actual 2009 publication is corroborated by contemporary play evidence.

The Tuck record represents the **manufactured Side Room game available in 2020**,
with a dated catalog row. A March 2020 received-copy account supplies actual
availability; the December 2019 distributor’s January shipment date was only a plan.
The 2018 PnP and 2019 campaign/copyright are separate. Later Italian rules identify
Tuck design/art and shared core; they are not an inspected original English manual.
Multiplayer requires multiple copies and is not counted as base-box support.

**Occhio! (1997)** is Lamberti’s two-player Jokerman game; the original manual
remains uninspected. **Odysea Organization (2024)** is Kmošek’s Czech workplace
card workshop, rather than the unsupported 2010 science-fiction game previously
described. Its publicly labeled instructions page explicitly offers only previews,
so counts, age and detailed rules stay unknown. Marketing claims about organizational
outcomes are not evidence that those outcomes occurred.

**Okiya (2012)** is scoped to the original Jactalea publication, with Cathala’s
own dated credits and release announcement. **Olympica (1978)** corrects a false
Jackson design credit: contemporary advertising names Willis, and the physical-set
index lists Jackson among playtesters. **Othello (1973)** uses the original Japanese
commercial-release identity; the unqualified 1977 row remains pending. Official
history distinguishes the first world championship and territorial licenses from
publication. Differing historical Reversi rules are not silently assigned to it.

Original **Project X (2006)** now separately represents the Lauwers game preceding
**Parker’s U.S. Pictureka (2007)**. A contemporary played reference supplies counts
through sixteen; the exact positive sixteen remains intact. The later game supports
open-ended 2+ and has a dated row. A PDF named Project X actually contains Hasbro’s
2008 instructions, so filename matching alone does not establish the represented
edition. The original Project X winning threshold and box labels are unverified.

**Pay Day** uses the represented **U.S. 1975** catalog identity with a dated row.
Early rules’ ©1974 does not resolve physical publication or Canadian territorial
claims, so generic 1974 stays pending. Session length depends on the chosen months;
the later six-player revision is not assigned to the early four-token game.

**Piepmatz (2018)** is the Lookout Riddle/Pinchback card game, with Langman art.
Its consulted English rules say 8+, versus the current publisher’s 10+; those
recommendations are explicit, without certifying a physical printing label.
The **1995** reference remains pending because independent sources establish both
**Girsch/F.X. Schmid’s search game** and **KRAG/HABA’s tree race**. Preserving an
external discovery ID does not independently verify which namesake its original
row intended, and neither maps to the 2018 card game. No earlier child-game credits
or rules were transferred to that record.

**Piratissimo** represents **Selecta’s 2005 product 3585**, from its own rules and
independent edition/physical-library evidence, with a dated row. The generic 2006
reference remains pending without a represented printing; the later 2016 reissue
is distinct. Original overload loses all cargo. **Pixie Queen (2017)** separates
finished-copy availability from the 2016 campaign and uses the English production
rulebook’s final scoring and role-specific credits. The best final total wins;
“fewest points” would give the wrong result once scores become positive.

**Planet (2018)** now uses Blue Orange’s original European identity, established
by its English rules and an actual six-play review in November 2018. Corrected
the designer to **Urtis Šulinskas** and illustrator to **Sabrina Miramon**.
Later review or localization dates do not establish the first release. Animal
awards begin in round three and use different habitat and adjacency conditions.

**Prime Climb (2014)** has actual purchased-copy and family-play evidence from
December 2014, beyond copyright or crowdfunding dates. Its official rules support
two to four in the main game and one in explicit solo challenges. Qualifying red
prime spaces earn cards after movement and bumping; not every prime earns one,
and 101 never does. The consulted manual’s manufacturing date and original art
credits remain unverified.

**Pony Express (2009)** is a new, separate Faidutti/Bauza/Funforge race with
Beaulieu illustrations, bluffing and physical die-rolling duels. It does not
replace **Polygon’s 1947 Pony Express**, whose museum artifact and Bratt credit
are independently established. The older game has a dated row, but its original
rules are inaccessible: unsupported counts, age, duration and precise ending
were cleared. Different piece materials belong to different physical issues.

**Push (2001)** now separately identifies Mühlhäuser’s wooden flicking game.
Creator chronology and a played review agree on 2001, but the first printing and
original publisher are unverified; the Steffen-Spiele company dates to 2003.
Specifications follow the later reviewed wooden issue. Its decorative origin
tale is not adopted as history. The retained **Ravensburger Push (2018)** has its
own dated row and original English USe01 rules. Banking protects exposed cards
from die losses; same-title matching must not transfer those rules to the wooden
game. Neither pair of unrelated namesakes gets a family or compatibility link.
