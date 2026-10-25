# Board game covers

The current design and implementation guide is [Cover images](../docs/cover-images.md).
Use `npm run audit:covers`, `prepare:cover`, `prepare:cover-proposal`, and
`export:covers` for the new workflow. Covers are edition-linked assets with
reviewed provenance and usage terms. Consumers can opt out of the separate feed.

The thirteen image files in this directory and `sources.yaml` are legacy
candidates, not an approved distribution set. Preserve them during migration;
do not infer new associations or permission from their filenames. Prepared
objects live in ignored `.local/cover-staging`, with content-addressed names.

`withdrawals.json` is an explicit list of asset UUIDs suppressed by the exporter,
including when it reads an old pinned release. Deployed object/CDN removal and
consumer cache withdrawal require the additional delivery controls in the guide.

[Historical acquisition plan](../docs/archive/2026-06-images/ACQUISITION_PLAN.md) and [legacy policy](../docs/archive/2026-06-images/FAIR_USE.md)
provide context; the current specification governs shared-asset publication.
