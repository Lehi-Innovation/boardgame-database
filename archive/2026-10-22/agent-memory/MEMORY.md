# Game Researcher Agent Memory

## Key Sources for Board Game Research
- Publisher websites: best for exact year, player count, playtime, age
- Wikipedia: most reliable single source — always include first
- Meeple Mountain (meeplemountain.com): solid overviews and publisher confirmation
- Board Game Quest (boardgamequest.com): reliable reviews
- Tabletop Bellhop (tabletopbellhop.com): designer credits and mechanic breakdowns
- Dice Tower (dicetower.com): reviews and news
- Opinionated Gamers (opinionatedgamers.com): detailed reviews
- Tric Trac (us.trictrac.net): French game coverage

## Slug Formatting
- Lowercase, hyphen-separated: `distilled`, `ark-nova`, `pandemic-legacy-season-1`
- Ampersand → "and": "Heaven & Ale" → `heaven-and-ale`
- French ampersand can use "et": "Donjons & Dominos" → `donjons-et-dominos`
- Accented chars stripped: "Drüber" → "druber"
- Parenthetical editions kept: "Fury of Dracula (Third Edition)" → `fury-of-dracula-third-edition`
- Punctuation stripped: "Hey, That's My Fish!" → `hey-thats-my-fish`
- Non-English titles: use original language for slug if that's the primary title (e.g., `um-reifenbreite`)

## Common Mechanic Mappings
- "Push-your-luck" → `Press Your Luck`
- "Simultaneous action selection" → `Simultaneous Action`
- "Card drafting from market" → `Hand Management` + `Drafting`
- "Tableau expansion" → `Tableau Building`

## Valid Tags — Common Mistakes
- `Agriculture` IS valid (theme tag — confirmed in schema)
- `Animals` IS valid (theme tag — confirmed in schema)
- `Pirates` IS valid (theme tag)
- `Dudes on a Map` IS valid (style tag)
- `Maritime` IS valid (theme tag)
- "Adventure" is NOT valid — use "Ameritrash" or "Fantasy"
- "Star Wars" is NOT valid — use "Sci-Fi"
- "Educational" is NOT valid

## Publisher Tags — In Schema
Eagle-Gryphon Games, Chip Theory Games, Days of Wonder, Osprey Games, Czech Games Edition, Fantasy Flight Games, Portal Games, Plaid Hat Games, Capstone Games, Stonemaier Games, Leder Games, CMON, Z-Man Games, Rio Grande Games, Ravensburger, Asmodee, Cephalofair Games, Roxley Games, Renegade Game Studios, Red Raven Games, Greater Than Games, Restoration Games

## Publishers NOT in Schema (omit from categories)
Repos Production, Orange Nebula, Le Scorpion Masqué, WizKids, Runaway Parade Games, Big Potato Games, Schmidt Spiele, Gamewright, AEG, Mayfair Games, Level 99 Games, Treefrog Games, Academy Games, Pandasaurus Games, Vesuvius Media, Alley Cat Games, Mighty Boards, Ludically, dlp games, Calliope Games, Space Cowboys, Arcane Wonders, Randolph, Hans im Glück

## Game Family Slugs
- COIN Series: `coin-series`
- Catan: `catan`
- Axis & Allies: `axis-and-allies`
- BattleLore: `battlelore`
- Arkham Horror: `arkham-horror`
- Antike: `antike`
- 51st State: `51st-state`
- Bang!: `bang`
- Agricola: `agricola`
- Summoner Wars: `summoner-wars`
- Viticulture: `viticulture`
- Sushi Go: `sushi-go`
- War of the Ring: `war-of-the-ring`
- Saint Petersburg: `saint-petersburg`
- South Tigris: `south-tigris`
- 18xx: `18xx`
- 7 Wonders: `7-wonders`

## Research Log
- The pipeline's `--log` flag handles all research-log.yaml appending automatically
- Do NOT manually read or append to sources/research-log.yaml

## Pipeline Notes
- Some URLs return empty (JS-heavy SPAs, Shopify stores)
- Always have 3 candidate URLs ready
- Wikipedia is the most reliable — always include first
- Skip pipeline when WebSearch gives sufficient detail — direct Write is faster

## Party Game Patterns
- rules_complexity 0-1, strategic_depth 0-1, length 0-1
- Evokes: Humor, Tension, Rivalry, Lucky, Persuasion
- true_counts skew toward higher player counts

## German-Origin Euro Games
- Include both original German publisher + English publisher in `publisher` field
- Hans im Glück NOT in schema categories
- German alternate titles go in `alternate_names[]`, use English title for slug

## Handling Multiple Editions
- Create separate files, link via `game_family`
- Original: `edition: first`; Second: `edition: second`
- Only use `expansions[]` for genuine expansions, not if 2nd ed fully replaces 1st

## Evokes Field — Common Mistake
- "Puzzle Solving" is a CATEGORY tag, NOT a valid evoke
- Valid evokes: Agency, Clever, Complete, Connection, Creative, Discovery, Dread, Humor, Lucky, Masterful, Mystery, Persuasion, Powerful, Progress, Rivalry, Tension, Unique, Wonder

## Batch Workflow (up to 50 games)
- WebSearch 2-3 queries per batch of ~3 games, then Write YAML directly
- Skip pipeline when WebSearch gives sufficient detail
- For 50 games: ~70 total tool calls typical
