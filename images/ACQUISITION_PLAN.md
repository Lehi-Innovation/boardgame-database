# Image Acquisition — Scoping & Plan

_Scoping snapshot as of 2026-06-09. Run `python3 scripts/image_manager.py` for live numbers._

## 1. Where we are

| Metric | Value |
|---|---|
| Games in catalog | 4,013 |
| Games **with** an image | 13 (0.3%) |
| Games **missing** an image | 4,000 |
| Distinct publisher names | 981 |
| Publishers with only 1 game (long tail) | 629 |
| Games with **no publisher** listed | 797 (20%) |

The current acquisition workflow (`images/README.md`) is **manual and official-source-only**:
download from a press kit (or email the publisher), save as `Game Name (Year).jpg`, and
record provenance in `images/sources.yaml`. No BoardGameGeek, no user-uploaded art.

## 2. The structural problem

The catalog is **highly concentrated at the head and very long-tailed**:

| Coverage | Publishers needed |
|---|---|
| 25% of games | top **12** publishers |
| 50% of games | top **52** publishers |
| 75% of games | top **220** publishers |
| 90% of games | top **618** publishers |

Official outreach scales with *publisher count*, not game count, so the head is cheap and
the tail is brutal. Concretely, **every publisher we have documented contact info for
(`publishers.yaml`, ~34 entries) together covers only 948 games (~24% of the catalog).**
The other ~3,050 games are spread across ~950 mostly-tiny or defunct publishers, or have
no publisher recorded at all.

### Hard-to-source segments
Several of the largest publishers are **defunct or mass-market** and have no press kit:
Avalon Hill (109), SPI (100*), Milton Bradley (67), Parker Brothers (57), Hasbro (52),
TSR (30). That's ~400 games where official self-service assets effectively don't exist.

## 3. Data-quality blockers — RESOLVED (Phase 0)

Publisher-name variants were inflating the publisher count and splitting coverage.
`scripts/normalize_publishers.py` now collapses casing/whitespace/suffix variants and
obvious same-company aliases to a canonical string, and drops the bogus `Unknown`
publisher. Applied across 198 files; distinct publisher names dropped **981 → 917**.
Examples: `Kosmos`+`KOSMOS` → 67, the seven `SPI`/`Simulations Publications…` variants → 118,
`Unknown` (31) cleared. Re-run the script after bulk game additions to keep counts honest.

## 4. Acquisition channels (by leverage)

Ordered by games-per-unit-effort:

| Tier | Channel | Games unlocked | Effort |
|---|---|---|---|
| **1** | **Asmodee bulk request** (FFG, Z-Man, Days of Wonder, Lookout, Hans im Glück, Plan B, Mayfair, Repos) | **375** | one email to `pr@asmodeena.com` |
| **2** | **Self-service press kits** (CGE, Pandasaurus, Leder, Repos, Awaken Realms, KOSMOS, Days of Wonder, Matagot, CMON, Ravensburger, Renegade) | **361** (overlaps Tier 1) | download directly, scriptable |
| **3** | **Email-contact publishers** (Rio Grande, GMT, Stonemaier, Eagle-Gryphon, Feuerland, Roxley, AEG, Garphill, Devir, …) | ~200 | per-publisher email, slow |
| **4** | **Long tail + no-publisher + defunct** | ~3,050 | not reachable via official press kits |

**Tiers 1–3 together ≈ the 948 games covered by documented publishers (~24%).** This is the
realistic ceiling for the strict "official only" policy without a licensing-policy change.

## 5. Recommended phasing

**Phase 0 — Foundations — DONE**
- ✅ Normalized publisher names (Section 3).
- ✅ Built `scripts/fetch_image.py`: downloads, validates format + resolution (≥500×500),
  saves with the correct `Game Name (Year)` filename, and records provenance in
  `images/sources.yaml`. Removes the manual bookkeeping that caused the filename mismatches.
- ✅ Defined the license field convention and the fair-use policy ([FAIR_USE.md](FAIR_USE.md)).

**Phase 1 — Self-service harvest (Tier 1+2, ~500–700 unique games)**
- Send the Asmodee bulk request early (long turnaround).
- Script downloads from the six+ self-service press kits. Update `publishers.yaml` status
  as each is worked (`not_contacted → contacted → approved`).

**Phase 2 — Email outreach (Tier 3, ~200 games)**
- Template + tracked outreach to the email-contact publishers. Use the Gmail integration to
  draft/send and track replies.

**Phase 3 — Long tail (~3,050 games)**
- In scope under the documented fair-use policy (decision recorded in Section 7). Source
  from Wikimedia Commons (CC/PD) first, then publisher storefronts / Wikipedia under
  fair use. Best target for batch automation given the volume.

## 6. Tooling gaps to close

- `scripts/fetch_image.py` — download + validate + record provenance (Phase 0).
- Publisher normalization + alias map.
- `image_manager.py check` already catches mismatches/dupes; add a `--fix-names` helper to
  auto-rename sanitized filenames to the canonical form.
- Optional: a per-publisher outreach tracker (could live in `publishers.yaml`).

## 7. Decisions

1. **Licensing scope — DECIDED (2026-06-09): documented fair use.** In addition to official
   press kits and Creative Commons sources, the project accepts publisher-storefront /
   Wikipedia / retailer images under a written fair-use policy ([FAIR_USE.md](FAIR_USE.md)).
   This brings the full ~4,000-game catalog into scope (BGG and user-uploaded hosts remain
   banned). Source preference order and per-image license tracking are defined in
   FAIR_USE.md and enforced via `sources.yaml`.
2. **Provenance/license convention — DECIDED.** `license` is one of `publisher-press-kit`,
   `publisher-permission`, `cc-by`, `cc-by-sa`, `cc0`, `public-domain`, `fair-use`.
   `scripts/fetch_image.py` records this automatically.

### Still open
- **Image resolution target.** Web-res (faster, often free) vs print-res (request-gated).
  FAIR_USE caps fair-use images at ~500–1500 px; press-kit images may go higher.
- **Automation appetite.** How far to push scraping for the self-service press kits and CC
  sources vs. manual per-game fetches.
