---
name: progress
description: Report CSV catalog coverage and requested queued, failed, skipped, ambiguous, or duplicate games.
user_invocable: true
---

# Catalog progress

Run `python3 scripts/progress.py N` from the repository root, using the requested nonnegative integer. Default to 20; use 0 for counts only. For a requested status view, use the supported `--failed`, `--skipped`, `--ambiguous`, or `--duplicate` flag.

Report counts and requested entries with source nominations where available. The catalog comes from `master_list.csv`; source lists enrich prioritization. An empty queue can coexist with excluded/failed entries, and matched CSV entries are not the same count as game files.

Read [the known coverage limitations](../../../docs/status.md). Nomination ordering is a backlog convenience, not a quality ranking. Coverage does not establish factual verification.
