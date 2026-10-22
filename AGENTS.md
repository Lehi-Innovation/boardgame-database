# Project guidance

Read [README.md](README.md), [the product brief](docs/product-brief.md), and [project status](docs/status.md) before choosing work. Use [project organization](docs/organization.md) when adding or moving files.

## Product intent

Help a broad audience discover games that fit their tastes and situation. Favor understandable experience descriptions and mobile use. Include familiar, children's, traditional, party, and demanding games; nomination counts must not become a universal quality ranking.

The owner welcomes initiative and is open to architecture and genre-system changes. Keep confirmed decisions distinct from proposals in maintained documentation.

## Data and research

- [schema.yaml](schema.yaml) is the current vocabulary and template. Consult it instead of copying rating/category lists into prompts.
- Follow [the research workflow](docs/research.md) for additions and corrections, including source policy and provenance.
- Keep personal affinity and hotness values unchanged unless the owner supplies ratings.
- Archive files are historical evidence, not current instructions or ready-to-publish records.
- When multiple workers are authorized, use separate game files and one coordinator for the shared research log.

## Implementation and checks

- Setup and verification commands live in [docs/development.md](docs/development.md).
- Read known limitations in [docs/status.md](docs/status.md); do not describe existing failures as passing checks.
- Preserve local caches and unrelated working changes. Generated files are covered by [.gitignore](.gitignore).
- Update the relevant maintained guide when behavior or file locations change. Keep paths portable and dated counts in the status document.
