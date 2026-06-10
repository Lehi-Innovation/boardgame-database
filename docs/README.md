# Marketplace Document Suite

First-draft product and architecture documents for a board game marketplace,
generated from a full discovery pass of this repository (June 2026).

| Doc | File | Grounding |
|---|---|---|
| Discovery Summary | [00-discovery-summary.md](00-discovery-summary.md) | Direct codebase inventory |
| Product Vision | [01-product-vision.md](01-product-vision.md) | Catalog facts + inferred positioning |
| PRD-01 Catalog & Data Model | [02-prd-01-catalog-data-model.md](02-prd-01-catalog-data-model.md) | **Strong** — fully implemented |
| PRD-02 Listings & Inventory | [03-prd-02-listings-inventory.md](03-prd-02-listings-inventory.md) | Greenfield — anchored to catalog |
| PRD-03 Search & Discovery | [04-prd-03-search-discovery.md](04-prd-03-search-discovery.md) | **Strong** for catalog search; greenfield for listings |
| PRD-04 Transactions & Trust | [05-prd-04-transactions-trust.md](05-prd-04-transactions-trust.md) | Greenfield — almost entirely open |
| Domain Model & ERD | [06-domain-model-erd.md](06-domain-model-erd.md) | **Strong** for Part A (as-built); inferred for extensions |

Markers used throughout: **[INFERRED]** (reasonable inference, not in code),
**[OPEN QUESTION: …]** (genuinely unknown), **[NEEDS REVIEW: …]** (human
confirmation required).

## Document Generation Summary

### Well-supported by the codebase
- The entire catalog layer: edition-level entries, `game_family`/`base_game`/
  `expansions[]`/`compatible_with[]` hierarchy, controlled vocabularies
  (52 mechanics, 13 styles, 35 themes, 18 evokes), the SQLite schema
  (12 tables), and every field name cited in PRD-01.
- The search/filter API surface (`/api/games/query` and friends), its exact
  parameters, sort whitelist, pagination, and its limitations (LIKE-only,
  alternate names unsearched, AND-only facets).
- The three frontend screens and their capabilities.
- The research/provenance machinery: BGG block, research log, image licensing,
  publisher outreach pipeline, master-list status lifecycle.
- Integrity gaps: soft cross-file links, expansion-link redundancy,
  designer/publisher dual-modeling, `min_age` schema omission, master-list
  duplicates.

### Inferred with low confidence (review carefully)
- That a **marketplace** is the intended destination at all — the brief says
  so, but the repo never does. The strongest internal hints are the
  "commercial use" image-licensing requirement, the clean-room/BGG-blocked
  data posture, and auth/admin listed as future work.
- Target users, north-star metric, fee posture, fixed-price-plus-offers
  default, the listing lifecycle straw man, and the transaction flow — all
  constructed, not found.
- That `source_count` can serve as a cold-start popularity signal, and that
  `evokes`/`categories` overlap can power similarity — plausible uses of real
  data, but unvalidated.

### Genuinely missing — needs human input
1. **Marketplace model**: transactional intermediary vs. connection board
   (PRD-04 §2) — most downstream decisions branch on this.
2. **Condition grading system** — nothing exists; the `value` field is a
   false friend (production value, not condition).
3. **Pricing**: model, fees, price guidance, and any pricing data at all.
4. **Users/auth**, and how the current single-owner personal fields
   (`affinity`, `hotness`, `plays_tracked`) migrate to a multi-user world.
5. **Item/Copy layer** below Edition; promo modeling; Work/`game_family`
   promotion to a real entity.
6. **Shipping & geography** — no address, weight, or dimension data anywhere.
7. **Payments, trust & safety, disputes** — zero code basis.
8. **BGG id policy** — keep `bgg_id` as a cross-reference key or drop it for
   full independence.
