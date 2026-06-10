# PRD-02 — Listings & Inventory

> **Status:** First draft — **almost entirely greenfield.** A repo-wide sweep
> found no listing, seller, inventory, condition, or pricing code. This PRD
> records what the existing catalog provides as anchor points, and marks every
> commerce decision as open. Treat the proposals here as straw men for review.

## 1. What Exists Today (anchor points)

- **The catalog edition entry** (`games/{slug}.yaml`, PRD-01) — the natural
  parent of any listing. Listing UIs can reuse the existing filter/search API
  (`GET /api/games/query`) for "find your game" pickers.
- **`upgrades[]`** — the schema already enumerates aftermarket components
  (metal coins, playmats, inserts, sleeves) per game. [INFERRED] Listings
  should let sellers check off included upgrades from this same vocabulary.
- **Image upload pipeline** — `POST /api/games/:id/upload` with multer +
  sharp validation (type whitelist, 20MB cap, dimension warnings, filename
  sanitization, path-traversal guards). [INFERRED] Directly reusable for
  seller condition photos, though storage is currently local-disk only
  (`web/README.md` flags cloud storage as future work).
- **`value` rating (0–4: Impulse → Heirloom)** — this is *production value of
  the game as designed*, *not* the condition of a copy. Calling this out
  explicitly because it is the nearest-sounding field and must not be
  conflated with condition grading.
- **No user model.** `web/README.md` lists authentication and an admin panel
  as unbuilt future enhancements. Sellers cannot exist before accounts do.

## 2. Creating & Managing Listings [INFERRED — no code exists]

Proposed flow, anchored to the catalog:

1. Seller searches the catalog (existing query API) and selects the **exact
   edition** — never free-text title entry.
2. Listing form pre-fills name, year, edition, box art, player counts,
   playtime from catalog data.
3. Seller adds: condition grade, condition notes, photos, included
   expansions/upgrades (checklist from `expansions[]` / `upgrades[]`),
   completeness statement, price, shipping options.
4. [OPEN QUESTION: what happens when the edition is missing from the catalog?
   Options: block listing, allow "unverified" listings pending catalog
   research, or feed the existing research pipeline (`game-researcher` agent)
   with seller-submitted requests. The research pipeline is an unusual
   existing asset here — it could give this marketplace same-day catalog
   coverage of new titles.]

## 3. Condition Grading System

[OPEN QUESTION: **no condition grading system exists anywhere in the repo.**]

[INFERRED] A board-game-specific scale must cover box, components, and
completeness separately (incumbents' single-letter grades conflate them).
Straw man for review:

- Overall: New-in-shrink / Like New / Very Good / Good / Acceptable / For parts
- Structured flags: `box_wear`, `components_complete` (bool + missing-list),
  `cards_sleeved`, `smoke_free_home`, `inserts_included`
- Free-text condition notes + minimum N photos for used copies

[NEEDS REVIEW: completeness verification is the #1 dispute source in this
category; decide how much structure to require at listing time.]

## 4. Pricing Model

[OPEN QUESTION: **no pricing code, fields, or data exist.**] Signals worth
noting: `retailer_check.py` shows the project already snapshots retail
catalogs (B&N, Target, GameNerdz, Amazon best-sellers) but captures **names
only, no prices**.

[INFERRED] Default recommendation: **fixed price with optional best-offer**,
matching peer marketplaces' dominant mode; auctions add complexity with no
supporting signal in this codebase. [NEEDS REVIEW]

[OPEN QUESTION: price guidance ("similar copies sold for…") requires
transaction history that won't exist at launch — seed strategy?]

## 5. Listing ↔ Catalog Linkage [INFERRED]

```
Listing.edition_id  →  games.id        (required FK — the core invariant)
Listing.includes[]  →  game_expansions.expansion_id / game_upgrades rows
Listing.seller_id   →  users.id        (entity does not yet exist)
```

The guardrail metric from the Product Vision (% of listings linked to a
catalog edition) depends on making `edition_id` mandatory.

A physical-copy ("Item") entity between Edition and Listing is optional at
MVP: a Listing can *be* the item record. [NEEDS REVIEW: if collection
management (the existing `plays_tracked` / `affinity` personal layer) becomes
a marketplace feature — "sell from your shelf" — a persistent Copy entity that
outlives listings becomes valuable.]

## 6. Listing Lifecycle States [INFERRED — none exist in code]

Straw man, modeled after the only state machines actually present in the repo
(master-list `status`: pending/skip/failed/ambiguous/duplicate, and publisher
outreach `status`: not_contacted/contacted/approved/declined — the project
demonstrably likes small explicit status enums):

```
draft → active → (reserved) → sold
            ↘ expired
            ↘ withdrawn
   any state → removed (moderation)
```

[OPEN QUESTION: do listings expire? Renewal/bump mechanics? Quantity >1
listings for sellers with multiple identical copies?]
