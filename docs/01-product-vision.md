# Product Vision — Board Game Marketplace

> **Status:** First draft, generated from codebase discovery (June 2026).
> The repository today is a curated board game **catalog**, not a marketplace.
> This document describes the marketplace product that the catalog foundation
> appears to be building toward. Everything commerce-specific is forward-looking
> and marked accordingly.

## What This Product Is

A peer-to-peer marketplace for buying and selling tabletop board games —
built on top of an independently researched, fully provenance-tracked game
catalog of 4,000+ titles that this repository already contains.

The catalog is the moat: every game entry carries structured metadata
(mechanics, themes, player counts, playtime, complexity, designer/publisher
credits), an 18-value emotional taxonomy (`evokes`), and edition/expansion
relationships — all researched from publisher sites, Wikipedia, and review
sites with every source URL logged (`sources/research-log.yaml`), and with
box-art images required to be licensed "for commercial use"
(`images/README.md`).

**Who it's for** [INFERRED]:
- **Sellers** — collectors thinning shelves, looking for less friction than
  eBay and a more game-literate audience than Facebook Marketplace.
- **Buyers** — hobbyists hunting specific editions, out-of-print titles, or
  bargains, who care about exactly which printing/edition they're getting.

[NEEDS REVIEW: confirm target geography, and whether the initial wedge is
peer-to-peer, consignment, or a single-merchant storefront.]

## The Problem It Solves

Today's options for second-hand board games are weak:

- **BGG Marketplace / GeekMarket** — the incumbent, but built atop BGG's
  crowd-sourced database with restrictive data terms, a dated UX, and listing
  quality that varies wildly. Notably, this project **deliberately blocks BGG
  as a data source** (CLAUDE.md "Blocked Sources") and built a clean-room
  catalog instead — [INFERRED] precisely so a commercial product is not
  encumbered by BGG's data licensing.
- **eBay / Amazon** — no board-game-native catalog: sellers retype titles, buyers
  can't reliably tell a 2007 *Brass: Lancashire* from a 2018 reprint, and
  search can't filter by mechanics, player count, or edition.
- **Facebook groups / Reddit (BGG geeklists, r/boardgameexchange)** — zero
  structure, zero buyer protection, discovery by scroll.

The core problem: **board games are edition-sensitive, condition-sensitive,
component-sensitive goods being sold on platforms that model none of those
things.** This codebase already models editions (`game_family`, `edition`,
`year`-per-edition), expansions (`base_game`, `expansions[]`), and even
aftermarket upgrades (`upgrades[]`: metal coins, inserts, playmats) — the
exact attributes a listing needs.

## North Star Metric

[OPEN QUESTION: no metric is stated anywhere in the repo.]

[INFERRED] Proposed: **completed transactions per month**, with a guardrail
metric of **% of listings linked to a catalog edition** (the structural
advantage only compounds if listings stay attached to clean catalog data).
[NEEDS REVIEW]

## What Makes This Different

1. **Catalog-first listings.** A seller picks the exact edition from the
   catalog; the listing inherits authoritative metadata and box art. No
   retyping, no ambiguity. (Foundation fully built: 4,016 structured entries,
   SQLite query layer, filter API.)
2. **IP-clean, provenance-backed data.** Every fact traces to a logged URL;
   every image has a license record. Competitors scraping BGG cannot say this.
   (Foundation fully built: `research-log.yaml`, `images/sources.yaml`,
   `publishers.yaml` outreach pipeline.)
3. **Feel-based discovery.** The `evokes` taxonomy (Tension, Wonder, Dread,
   Clever…) and `true_counts` ("actually best at 2") enable discovery no
   incumbent offers — "show me tense 2-player games under an hour, for sale
   near me." (Catalog half built; commerce half greenfield.)
4. **Edition-aware trust.** Because the catalog distinguishes printings and
   expansions, buyers know precisely what they're buying, and disputes have an
   objective reference. [INFERRED]

## What This Is NOT

- **Not a price-guide or valuation service** — no pricing data exists in the
  repo. [OPEN QUESTION: is historical price tracking in scope at all?]
- **Not a BGG replacement** — no forums, no crowd ratings, no play-logging
  community. (`plays_tracked` exists but is single-owner and unbuilt.)
- **Not a retailer/distributor of new games** — `retailer_check.py` watches
  retail catalogs for *coverage comparison*, not for selling new stock.
  [NEEDS REVIEW: confirm new-in-shrink games from individuals are still in
  scope.]
- **Not a digital play platform** — BGA/Tabletopia comparisons in
  `compare_sources.py` are catalog-completeness tools only.
- **Not an auction house** [INFERRED — no auction signals anywhere; default to
  fixed price + offers, see PRD-02. NEEDS REVIEW.]

## Where We Are Today (honest baseline)

| Capability | Status |
|---|---|
| Game catalog (editions, expansions, taxonomy) | **Built** — 4,016 entries, 96%+ of tracked universe |
| Catalog search & filtering API + UI | **Built** (single-user, local) |
| Image pipeline with licensing provenance | **Built**, coverage tiny (~17 images) |
| User accounts / auth | **Not started** (explicitly listed as future work in `web/README.md`) |
| Listings, condition grading, pricing | **Not started** |
| Payments, shipping, escrow, disputes | **Not started** |
| Seller ratings / reviews | **Not started** |
