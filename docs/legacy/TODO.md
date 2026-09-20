# TODO

## High Priority

- [x] Revamp look and feel — warm dark theme across all three web pages (2026-08-06)
- [ ] Build remaining source lists
  - [ ] Dicebreaker Top 100
  - [ ] Shut Up & Sit Down Recommendations
  - [ ] No Pun Included Best Games
  - [ ] BoardGameQuest Top Games
  - [ ] Reiner Knizia collection
  - [ ] Uwe Rosenberg collection
  - [ ] Stonemaier Games collection
  - [ ] Gateway Games Classics
- [ ] Complete Golden Geek and Deutscher Spiele Preis — fill in missing years/categories
- [x] Continue adding game entries — queue cleared, 0 remaining (96.1% complete, 4,046/4,209)
- [ ] Obtain box art images (see `images/README.md`)
  - Contact publishers for press kits
  - Download from official websites
  - Naming: `Game Name (Year).jpg`

- [ ] Clean up master list duplicates — entries like "Clank! A Deck-Building Adventure" vs "Clank!: A Deck-Building Adventure" (use `python3 scripts/progress.py --duplicate` to review)

## Medium Priority

- [ ] Add expansion files — separate YAML for major expansions
  - Dominion expansions (Intrigue, Seaside, Prosperity, etc.)
  - Terraforming Mars expansions
  - Spirit Island expansions
  - Gloomhaven: Forgotten Circles, Jaws of the Lion
- [ ] Add edition variants — track different editions
  - Dominion Second Edition
  - Great Western Trail Second Edition
  - Agricola Revised Edition
- [ ] Verify/update data — cross-reference with publisher sites
  - Some playtimes may need adjustment
  - Verify player counts against official sources

## Lower Priority

- [ ] Add upgrade entries — populate upgrade sections (metal coins, playmats, inserts, etc.)
- [x] Create query tools — `games.db` (SQLite) built by `scripts/build_db.py`; enables SQL queries across all games
- [ ] Build a web frontend — Node.js app powered by `games.db` for browsing, filtering, and searching
- [ ] Data quality queries — use `games.db` to find: missing descriptions, games with <5 evokes, categories not in schema, etc.
- [ ] Speed up `progress.py` / `image_manager.py` — optionally read from `games.db` instead of re-parsing all YAML files
- [ ] Add more designers to tags — expand designer category list
- [ ] Add plays tracking — structure for logging game sessions
