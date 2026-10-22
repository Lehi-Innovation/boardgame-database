---
name: add-game
description: Research and create a requested board game record with source provenance. Use when adding a game to this repository.
argument-hint: "[game name]"
disable-model-invocation: false
context: fork
model: sonnet
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Bash(python3 scripts/game_pipeline.py *), Bash(python scripts/game_pipeline.py *), Bash(python3 -c *), Bash(python -c *)
---

# Add a game

Research the requested game: **$ARGUMENTS**. Paths used in commands are relative to the repository root.

Read [the shared research workflow](../../../docs/research.md), [current known issues](../../../docs/status.md), and [the schema](../../../schema.yaml). Use these maintained definitions instead of a copied template or remembered rating scale.

Check IDs, primary names, alternate names, and editions before creating a record. If the same game already exists, report the existing path rather than overwriting it.

Research the game using suitable sources, create `games/{slug}.yaml`, and record the evidence actually consulted in the canonical research-log format. Follow the workflow's current provenance limitations and source policy. When sharing work with other researchers, coordinate shared-log updates.

Read back and validate the saved record. Personal ratings stay null on new entries; initialize other fields from the schema. Report the game, file, player counts, actual sources logged, and any uncertainty or incomplete provenance. Do not claim completion if the record or required evidence has not been saved.
