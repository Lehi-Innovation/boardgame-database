# Random 200 source review protocol

The frozen [manifest](manifest.json) identifies the random sample, selection
algorithm, seed, filenames, and SHA-256 of every examined YAML file. Batch
assignments are interleaved through the ranked sample to avoid any batch
selection effect. Reviews go in `reviews-a.jsonl`, `reviews-b.jsonl`,
`reviews-c.jsonl`, and `reviews-root.jsonl`. The consolidated
`review-ledger.jsonl` is the record of what has actually been examined.

For each assigned game, read the entire YAML and check:

1. Identity: title, edition, standalone/expansion status, and linked game.
2. Objective metadata: publication year, designer, publisher, supported players,
   age, and playing time. Respect edition and regional differences.
3. Every specific factual claim in the description that can be checked (awards,
   components, mechanisms, historical claims, rule details). Do not treat
   subjective ratings, `true_counts`, `evokes`, or style tags as facts.
4. Internal contradictions or omissions that affect an objective field.

Use current primary sources where possible: publisher product page/rulebook,
designer page, award organizer, or the game's own official site. BoardGameGeek
game pages are a useful structured secondary catalog; distinguish them from
publisher evidence. For older or traditional games, use the best available
source and record limits. Do not treat `master_list.csv` or a copied description
as independent corroboration. A matching source for title alone does not verify
all fields.

One JSON object per selected game, with this shape:

```json
{
  "index": 1,
  "file": "example.yaml",
  "id": "example",
  "sha256": "hash from manifest",
  "reviewed_at": "2026-10-01",
  "status": "verified|issues|partial|unverifiable",
  "checked_fields": ["identity", "year", "designer", "publisher", "players", "age", "playtime", "description", "relationships"],
  "sources": [{"url": "https://...", "kind": "publisher|rulebook|designer|award|bgg|other", "supports": ["year", "players"]}],
  "findings": [{"field": "designer", "recorded": "...", "suggested": "...", "reason": "...", "source_urls": ["https://..."], "confidence": "high|medium|low"}],
  "unresolved": ["Exact edition unclear; publisher date is for a reprint"],
  "notes": "Short summary of the review"
}
```

`verified` means every applicable objective field and material description
claim has adequate evidence. `issues` means at least one supported discrepancy;
unresolved items may still be present. `partial` means no confirmed discrepancy
but evidence is missing for some applicable facts. `unverifiable` means the
identity itself cannot be established from accessible sources. Every row must
have at least one source or a clear explanation of why no usable source was
found. Never guess a correction.
