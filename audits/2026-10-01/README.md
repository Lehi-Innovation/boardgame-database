# Legacy boardgame catalog quality audit — 2026-10-01

## Scope and method

The authoritative legacy data is `games/*.yaml`. I parsed all **4,013** files with
PyYAML, checked structural and cross-record invariants, compared links in the
**4,242-row** `master_list.csv`, checked the `games.db` row count and source digest,
and attempted to parse `sources/research-log.yaml`. The audit was read-only for
catalog data. Run it again with:

```sh
python3 scripts/audit_legacy_quality.py --output /tmp/legacy-quality.json
```

The complete, per-file review queue is [legacy-quality.json](legacy-quality.json).
Counts below are flagged occurrences, not necessarily distinct games. A flag is
an internal inconsistency or a request for human review; it is not proof that an
unsourced historical or edition-specific fact is wrong.

The separate [random 200-game source review](random-200/PROTOCOL.md) is incomplete.
Only eight reviews are recorded in `random-200/reviews-root.jsonl`; the other
batch files and consolidated ledger described by its protocol do not exist yet.
That sample must not be reported as a completed 200-game factual review.

## Results

| Area | Result | Interpretation |
| --- | ---: | --- |
| YAML parse and unique IDs | 4,013 parse; no duplicate IDs | Basic loading works. |
| SQLite cache | 4,013 rows; source digest matches | Cache reflects current YAML bytes. |
| Numeric YAML IDs | 6 files | Five retain their filename text after string conversion; `007.yaml` loads as integer `7`, losing leading zeros. Quote all six IDs to enforce string identity. |
| Dangling relations | 146 references in 83 files | 133 `expansions`, 7 `compatible_with`, 6 `base_game`. Some may be intentionally planned titles, but current links cannot resolve. |
| Controlled vocabulary drift | 183 uses in 179 files | 149 categories and 34 evokes are outside `schema.yaml`; decide whether to extend the vocabulary or correct each value. |
| Player counts above schema limit | 107 values in 19 files | Real party games can exceed 12 players. The schema's `1–12` plus `12+` limit conflicts with these exact counts; this is primarily a schema decision. |
| Duplicate list values | 3 files | `dog.yaml` repeats an alternate name; `jurassic-snack.yaml` and `tickle-bee.yaml` repeat an evoke. |
| Duplicate normalized titles | 15 records across 7 groups | Some are distinct games or editions. `citadel.yaml` and `citadels.yaml` both describe the 2000 game and deserve identity review. |
| Missing credits | 1,154 designer; 829 publisher | Treat as unknowns pending sources, not as false facts. |
| Missing publication year | 49 `null`; 5 use `0` | Check the `0` convention for ancient or unknown dates. Negative BCE years were retained as valid data. |
| Master-list conflicts | 60 title; 59 year; 7 YAML IDs linked to multiple BGG IDs | Includes aliases and edition differences as well as clear identity errors; review before using the master list as an authority. |
| Research log | Parse error at line 5,031 | The file starts as an `entries:` mapping and later switches to a top-level list, so one YAML parser cannot read it as a single document. |
| Research trail coverage | 644 of 4,013 YAML IDs appear in literal `game_id:` lines | This is a text scan of the malformed log, not a validated citation audit. **3,369** IDs have no matching log mention; sources may exist elsewhere. |

`affinity` and `hotness` are null in all 4,013 records, consistent with the
schema's instruction to leave personal ratings null until rated. They are not
missing-fact findings.

## Confirmed factual corrections to review

1. [`games/citadel.yaml`](../../games/citadel.yaml) credits Bruno Cathala, while
   its own description says Bruno Faidutti. The separate
   [`games/citadels.yaml`](../../games/citadels.yaml) credits Faidutti. The
   [Fantasy Flight Citadels rulebook](https://images-cdn.fantasyflightgames.com/ffg_content/Citadels/citadelsrules.pdf)
   credits Bruno Faidutti. Resolve the duplicate identity, then correct the
   surviving designer field.
2. [`games/fist-of-dragonstones.yaml`](../../games/fist-of-dragonstones.yaml)
   credits Bruno Cathala; its description names Bruno Faidutti and Michael
   Schacht. The [Days of Wonder announcement](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/09/DoW_news003.pdf)
   credits Faidutti and Schacht. Correct the designer list after confirming
   which edition this record describes.
3. [`games/endeavor-deep-sea.yaml`](../../games/endeavor-deep-sea.yaml) says the
   game was a Kennerspiel des Jahres nominee. The [2025 award organizer's winners
   page](https://www.spiel-des-jahres.de/en/award-winners-2025/) lists it as the
   **winner**. Update the description.
4. `master_list.csv` links `imperium-horizons` to BGG ID **3661**, whose
   [BoardGameGeek entry](https://boardgamegeek.com/boardgame/3661/imperium-empires-in-conflict-worlds-in-the-balance)
   is a 1977 game. The [publisher's Imperium: Horizons page](https://www.ospreypublishing.com/us/imperium-horizons-9781472858368/)
   describes the 2024 title. It also links `endeavor-deep-sea` to BGG ID
   **33160**, which is [Endeavor (2009)](https://boardgamegeek.com/boardgame/33160/endeavor),
   while the game's YAML says `Endeavor: Deep Sea` (2024). Remove or replace
   these mismatched links only after verifying the correct destination IDs.

`games/unfathomable.yaml` lists Corey Konieczka alone, while its description
also names Tony Fanchi. The [publisher's product page](https://www.fantasyflightgames.com/product/unfathomable/)
lists both; the [rulebook credits](https://images-cdn.fantasyflightgames.com/filer_public/d6/e4/d6e4a0e1-afa9-4920-9ce2-5f7b49e1e7ab/unf01_learn_to_play_eng_v5-compressed.pdf)
distinguish Fanchi's game design from Konieczka's earlier design. Decide the
catalog's credit policy before editing this field.

## Suggested order

1. Resolve the two wrong BGG links and the `citadel`/`citadels` identity. These
   can contaminate imports and searches.
2. Correct verified credits and the stale award sentence, then repair the
   research-log syntax so citations can be loaded.
3. Triage dangling relations: add actual catalog records, remove unsupported
   links, or explicitly model planned expansions.
4. Decide the player-count and year-zero conventions, then reconcile taxonomy
   terms. Keep missing credits and years unknown until primary sources establish
   them.

This is a full-corpus **internal** audit with a small source-verified sample.
It does not establish factual accuracy for every designer, year, player count,
description, or edition across the 4,013 entries. That requires a separate
record-by-record primary-source verification pass with field-level citations.
The separate `pipeline_cache.db` holds 1,106 cached source rows for 517 internal
cache game IDs; its integer IDs cannot be assumed to map to the YAML slugs.
