# Consumer integrations

The [legacy name snapshot](../name-snapshot.md) is the shared artifact. Its
source IDs remain strings; each consumer maps them to its own local game IDs.
Search runs in each consumer's database after an explicit import.

| Consumer | Read when you need… |
| --- | --- |
| [Rails boardgame-marketplace](boardgame-marketplace.md) | The local search/selection adapter and its later reviewed-catalog crosswalk |
| [Django boardgame-exchange](boardgame-exchange.md) | Its management command, local alias search, and collection integration |

These applications live in sibling repositories. The detailed briefs record
the September 20 local verification and may not reflect later edits there.
The optional reviewed [cover feed](../cover-images.md) has not been adopted by
either names-only adapter.
