# Documentation map

Start with the [current status](status.md). Choose the next file by the work you
are doing; dated material lives in the [archive](archive/README.md).

| If you need to… | Read |
| --- | --- |
| Set up, run, or test the reviewed catalog | [Development](development.md); use the [demo](demo.md) for a manual contribution/review walkthrough |
| Run the original YAML/Express application | [Legacy app and cache](legacy-app.md) |
| Change editorial commands or permissions | [Editorial API](editorial-api.md), then the [generated OpenAPI contract](contracts/openapi.json) |
| Change domain identity or publication design | [Architecture specification](architecture.md) and [decision records](decisions/README.md); the [approved game/edition rule](decisions/001-catalog-identity.md) is the short policy reference |
| Prepare reviewed legacy candidates | [Pilot importer](pilot-import.md) and its [candidate manifest](../imports/boardgame-marketplace/README.md) |
| Export or consume names | [Name snapshot](name-snapshot.md); [Rails](consumers/boardgame-marketplace.md) and [Django](consumers/boardgame-exchange.md) notes explain their local adapters |
| Prepare, review, or deliver stock covers | [Cover specification](cover-images.md), then the [twenty-game research packet](../imports/boardgame-marketplace/cover-review/README.md) |
| Find earlier reasoning, measurements, or proposals | [Archive index](archive/README.md); [legacy document index](legacy/README.md) |

The root [README](../README.md) is the entry point. Current guides distinguish
implemented behavior from planned work; `architecture.md` is a detailed design
specification. Generated schemas and source code are the exact
contract when a prose summary and code differ. Archive files preserve what was
known at their dates and should not be used as current instructions.
