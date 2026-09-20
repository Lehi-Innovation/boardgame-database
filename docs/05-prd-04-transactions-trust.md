# PRD-04 — Transactions & Trust

> **Status:** First draft — **entirely greenfield.** The repo contains no
> transaction, payment, shipping, rating, review, dispute, or fraud code, and
> no user entity for any of it to hang off. This PRD therefore (a) inventories
> the few trust-adjacent assets that *do* exist, and (b) frames the decisions
> to be made, with straw-man defaults marked [INFERRED] for review.

## 1. Trust-Adjacent Assets That Exist Today

These are real, if unusual, foundations for a trust story:

1. **Data provenance culture.** Every catalog fact traces to a logged URL
   (`sources/research-log.yaml`, 2,510 entries); every image has a
   license record (`images/sources.yaml`); CLAUDE.md mandates the audit trail.
   [INFERRED: "our catalog data is verifiable" extends naturally to "our
   listings are verified against that catalog."]
2. **A working outreach state machine.** `publishers.yaml` tracks per-publisher
   `status: not_contacted | contacted | approved | declined` — evidence the
   project already manages permission workflows explicitly.
3. **Edition-precise catalog.** The single best dispute-prevention tool in this
   category: buyer and seller agree on an exact `games.id` before money moves
   (PRD-01, PRD-02).
4. **Upload hygiene.** The image endpoint already validates MIME/extension,
   caps size, sanitizes filenames, and blocks path traversal
   (`web/server.js`) — small, but it is the only safety logic in the repo.

Everything below this line has **no code basis**.

## 2. Transaction Flow [INFERRED — straw man]

```
browse → (offer ⇄ counter)* → acceptance → payment (held) → seller ships
      → tracking confirmed → buyer confirms receipt & condition
      → payout released → mutual feedback
```

- Fixed-price purchase skips the offer loop (PRD-02 §4 recommends fixed price
  + optional best-offer).
- [OPEN QUESTION: is the platform a transactional intermediary (handles
  money, takes fees, owns disputes) or a connection board (BGG-style, users
  settle externally)? Every subsequent decision branches on this. The
  clean-room/commercial-licensing posture of the repo suggests ambition
  beyond a connection board, but nothing in code decides this.]

## 3. Payment Handling

[OPEN QUESTION: **no payment integration or configuration exists** — no
Stripe/PayPal keys, no `.env` templates referencing processors, nothing.]

[INFERRED] Straw man: delegated marketplace processor (e.g., Stripe Connect)
with funds held until buyer confirmation — buys KYC, payouts, and chargeback
tooling rather than building them. [NEEDS REVIEW: fee model (listing fee vs.
final-value %), and which side pays.]

## 4. Shipping

[OPEN QUESTION: **no shipping, address, or geo concept exists anywhere in the
repo** — games have no weight/dimension fields either.]

Notes for the reviewer:
- Board games are heavy, dishevelment-prone parcels; condition disputes often
  originate in transit packing.
- The catalog *could* carry per-edition box dimensions/weight to power rate
  quotes, but no such fields exist today and the research pipeline doesn't
  collect them. [NEEDS REVIEW: adding `box_dimensions`/`weight_grams` to the
  edition schema would be a catalog-side prerequisite for label integration.]
- [OPEN QUESTION: label integration vs. seller-managed shipping vs. local
  pickup at MVP?]

## 5. Trust Signals: Ratings, Reviews, Disputes

All [OPEN QUESTION — nothing exists]. Straw-man positions [INFERRED]:

- **Feedback:** mutual, transaction-gated (only completed orders can review),
  separate star axes for *accuracy of condition description* vs.
  *shipping/communication* — condition-accuracy is the category's core risk.
- **Seller signals:** completed-sale count, dispute rate, member-since;
  catalog-linkage discipline (listings always attached to exact editions) can
  itself be surfaced as a quality badge.
- **Disputes:** the edition + condition-grade + photo record gives an
  objective baseline; flow: buyer opens case → seller responds → platform
  arbitrates against the listing record. Requires the
  transactional-intermediary answer from §2.
- **Reviews of games themselves:** out of scope — the catalog's `affinity`/
  `hotness` are a private single-owner rating layer, not community reviews
  (Product Vision: "Not a BGG replacement").

## 6. Fraud & Safety

**Present in code:** only the upload validations noted in §1.4.

**Absent (flagging, not specifying):** account verification, rate limiting,
session management (no auth at all — `web/README.md`: "No authentication (add
if deploying publicly)"), CSRF protection, stolen-goods/counterfeit policy
(counterfeit reprints are a real problem for high-value titles), off-platform
payment circumvention detection, PII handling (the current stack stores
nothing personal). [NEEDS REVIEW: all of it. The existing Express app is a
trusted-single-user local tool and must not be exposed publicly as-is.]
