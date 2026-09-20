#!/usr/bin/env python3
"""
Compare multiple curated game sources against our database.
Shows which games are missing and how many sources reference them.
"""

import csv
import os
import re
from collections import defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# Source data
# ---------------------------------------------------------------------------

SOURCES = {}

SOURCES["Board Game Arena"] = [
    "51st State: Master Set", "6 nimmt!", "7 Wonders", "7 Wonders (Second Edition)",
    "7 Wonders Duel", "7 Wonders: Architects", "A Gest of Robin Hood", "Abalone",
    "Abandon All Artichokes", "Abyss", "Age of Civilization", "Age of Innovation",
    "Agent Avenue", "Agricola (Revised Edition)", "Ahoy", "Akropolis", "Alchemists",
    "Alhambra", "Amalfi: Renaissance", "Amerigo", "Amyitis", "Anachrony",
    "Ancient Knowledge", "Apiary", "Applejack", "Aquatica", "Arboretum",
    "Architects of the West Kingdom", "Arctic Scavengers", "Ark Nova", "Assyria",
    "Astra", "Awkward Guests: The Walton Case", "Azul", "Azul Duel",
    "Azul: Summer Pavilion", "Backgammon", "Bandido", "BANG!", "Bärenpark",
    "Barrage", "Bayonets & Tomahawks", "Beyond the Sun", "Bohnanza", "Bonsai",
    "Boomerang: Australia", "Botanicus", "Botanik", "Break the Code", "Bruges",
    "Bunny Kingdom", "Burgle Bros.", "Cacao", "Café", "Cairn", "Can't Stop",
    "Canvas", "Caper: Europe", "Carcassonne", "Carcassonne: Hunters and Gatherers",
    "Carnegie", "Carson City", "Cartographers", "Castle Combo",
    "Castles of Mad King Ludwig", "Cat in the Box: Deluxe Edition", "CATAN",
    "Caverna: The Cave Farmers", "Caylus", "Celestia", "Century: Golem Edition",
    "Century: Spice Road", "Chakra", "Challengers!", "Chemical Overload", "Chess",
    "Chicago Express", "Chimera Station", "Chocolate Factory", "Citadels", "Cities",
    "City of the Big Shoulders", "Claim", "Cloud City", "Coal Baron", "Cóatl",
    "Codex Naturalis", "Coffee Rush", "Coloretto", "Colt Express", "Concept",
    "Conspiracy: Abyss Universe", "Copenhagen", "Cosmoctopus", "Coup", "Cribbage",
    "Crusaders: Thy Will Be Done", "Crypt", "CuBirds", "D.E.I.: Divide et Impera",
    "Dale of Merchants", "Darwin's Journey", "Daybreak", "Decrypto", "Deus",
    "Diamant", "Dice Forge", "Dice Hospital", "DinoGenics", "Discordia",
    "Distilled", "Dog Park", "Downforce", "Dracula vs Van Helsing", "Draftosaurus",
    "Dragon Castle", "Dragonheart", "Dragonwood", "Dungeon Petz", "Dungeon Roll",
    "Dungeon Twister", "DVONN", "Earth", "Eminent Domain", "Equinox",
    "Escape: The Curse of the Temple", "Ethnos", "Evergreen", "Evolution",
    "Expedition: Northwest Passage", "Exploding Kittens", "Faraway", "Federation",
    "Finca", "Five Tribes: The Djinns of Naqala", "Fleet", "Flip 7",
    "For Northwood! A Solo Trick-Taking Game", "For Sale", "Forbidden Island",
    "Forest Shuffle: Dartmoor", "Formula D", "Framework", "Fromage", "Gaia Project",
    "Galactic Cruise", "Gatsby", "Get on Board: New York & London", "Ginkgopolis",
    "GIPF", "Gizmos", "Glass Road", "Glow", "Go", "Go Nuts for Donuts", "Goa",
    "Gold West", "Good Cop Bad Cop", "Great Western Trail",
    "Great Western Trail: El Paso", "Great Western Trail: Second Edition", "Habitats",
    "Hadara", "Hadrian's Wall", "Haggis", "Hanabi", "Hanamikoji", "Happy City",
    "Harbour", "Hardback", "Harmonies", "Hawaii", "Hearts",
    "Heat: Pedal to the Metal", "Hegemony: Lead Your Class to Victory",
    "Hey, That's My Fish!", "Hidden Leaders", "High Season: Grand Hotel Roll & Write",
    "Hive", "Homesteaders", "I'm the Boss!", "Imhotep", "Imperial Miners",
    "In the Year of the Dragon", "Incan Gold", "Innovation", "Inside Job",
    "Irish Gauge", "It's a Wonderful Kingdom", "It's a Wonderful World", "Iwari",
    "Jekyll vs. Hyde", "Jump Drive", "Just One", "Knarr", "Kōhaku", "Koryŏ",
    "Krosmaster: Arena", "L.L.A.M.A.", "La Famiglia: The Great Mafia War",
    "La Granja", "Lancaster", "Living Forest", "Lords of Xidit",
    "Lorenzo il Magnifico", "Lost Cities", "Lost Ruins of Arnak", "Luxor",
    "Madeira", "Magic Maze", "Mandala", "Marco Polo II: In the Service of the Khan",
    "Marrakech", "Mascarade", "Masters of Renaissance: Lorenzo il Magnifico",
    "Medina", "Medina (Second Edition)", "Memoir '44", "Mercado de Lisboa",
    "Metro", "Mexica", "Mind MGMT", "Mini Rogue", "MLEM: Space Agency", "Mr. Jack",
    "My City", "Mythic Battles: Ragnarök", "Nanga Parbat", "NEOM", "New Frontiers",
    "New York Zoo", "Newton", "Next Station: London", "Niagara", "Nidavellir",
    "Nimalia", "Nippon", "No Thanks!", "Not Alone", "Nova Luna", "Now Boarding",
    "Nucleum", "Obsession", "Oh Hell!", "On Tour", "Onitama", "Oriflamme",
    "Orléans", "P.I.", "Pacts", "Pagan: Fate of Roanoke", "Paint the Roses",
    "Panda Spin", "Pandemic", "Paris Connection", "Patchwork",
    "Path of Civilization", "Pax Pamir: Second Edition",
    "Pax Renaissance: 2nd Edition", "Pente", "Pergola", "Perudo",
    "Photosynthesis", "Pipeline", "Pixies", "Planet Unknown",
    "Polis: Fight for the Hegemony", "Potion Explosion", "Praga Caput Regni",
    "Puerto Rico", "Quantum", "Quartermaster General: South Front", "Quarto",
    "Quoridor", "Qwinto", "Race for the Galaxy", "Railroad Ink: Blazing Red Edition",
    "Railroad Ink: Deep Blue Edition", "Railways of the World", "Rallyman: DIRT",
    "Rallyman: GT", "Rats of Wistar", "Rauha", "Red7", "Regicide", "Res Arcana",
    "Revive", "Ride the Rails", "Riftforce", "Riichi Mahjong", "River of Gold",
    "River Valley Glassworks", "Roll for the Galaxy",
    "Roll Through the Ages: The Bronze Age", "Roll Through the Ages: The Iron Age",
    "Room 25", "Rumble Nation", "Rummy", "Russian Railroads", "Saboteur", "Sagani",
    "Sail", "Saint Petersburg", "Schotten Totten", "Scythe", "Sea Salt & Paper",
    "Seasons", "Seikatsu", "Shogun", "Signorie", "Silver", "Similo", "Skara Brae",
    "Skat", "Skull", "Sky Team", "Small World", "Solar Storm", "Space Base",
    "Space Empires 4X", "Space Station Phoenix", "Spades", "SpellBook",
    "Spirits of the Forest", "Splendor", "Splendor Duel", "Spot it!", "Spots",
    "Spyrium", "Star Fluxx", "Steam Works", "SteamRollers", "Stella: Dixit Universe",
    "Stockpile", "Stone Age", "Stonespine Architects", "Streets", "Stupor Mundi",
    "Super Fantasy Brawl", "Super Mega Lucky Box", "Sushi Go Party!", "Sushi Go!",
    "Tag Team", "Takenoko", "Talon", "Taluva", "Tash-Kalar: Arena of Legends",
    "Teotihuacan: City of Gods", "Terra Mystica", "Terra Nova",
    "That Time You Killed Me", "That's Life!", "The Battle for Hill 218",
    "The Boss", "The Builders: Antiquity", "The Builders: Middle Ages",
    "The Castles of Burgundy", "The Crew: Mission Deep Sea",
    "The Crew: The Quest for Planet Nine", "The Fox in the Forest",
    "The Fox in the Forest Duet", "The Gang", "The Great Split",
    "The Guild of Merchant Explorers", "The Isle of Cats", "The Isle of Cats Duel",
    "The King's Guild", "The Lord of the Rings: Fate of the Fellowship",
    "The Palaces of Carrara", "The Vale of Eternity", "The Voyages of Marco Polo",
    "The Werewolves of Miller's Hollow", "The White Castle", "The Wolves",
    "Through the Ages: A New Story of Civilization",
    "Through the Ages: A Story of Civilization", "Thurn and Taxis", "Tichu",
    "Ticket to Ride", "Ticket to Ride: Europe", "Tigris & Euphrates", "Tikal",
    "Tinners' Trail", "Tiny Epic Defenders (Second Edition)", "Tiwanaku", "Tobago",
    "Tokaido", "Tortuga 1667", "Tournay", "Tower Up", "Toy Battle", "Tranquility",
    "Trek 12: Himalaya", "Trekking the World", "Trio", "Troyes", "Troyes Dice",
    "Turing Machine", "Turn the Tide", "Twilight Imperium: Fourth Edition",
    "Tzolk'in: The Mayan Calendar", "Ubongo",
    "Unconditional Surrender! World War 2 in Europe", "Verdant", "Via Magica",
    "Villagers", "Viticulture", "Voyages", "Wandering Towers",
    "Welcome to New Las Vegas", "Welcome to the Moon", "Welcome To...", "Wingspan",
    "Wizard", "Wizards of the Grimoire", "Wondrous Creatures", "Xiangqi", "YINSH",
    "Yōkai", "Yokohama", "Yspahan", "Zooloretto",
]

SOURCES["Tabletopia"] = [
    "Alien Frontiers", "Altiplano", "Anachrony", "Aquatica",
    "Architects of the West Kingdom", "Barrage",
    "Between Two Castles of Mad King Ludwig", "Bonfire", "Brass: Birmingham",
    "Burgle Bros.", "Calico", "Cartographers", "Cascadia",
    "Castles of Mad King Ludwig", "Champions of Midgard", "Chess",
    "Clans of Caledonia", "Dark Moon", "Detective: A Modern Crime Board Game",
    "Dominant Species", "Dwellings of Eldervale", "Everdell", "Feudum", "Furnace",
    "Glen More II: Chronicles", "Gùgōng", "Hansa Teutonica", "Hero Realms",
    "Islebound", "K2", "Kanban EV", "Kanban: Driver's Edition", "Keyflower",
    "Lewis & Clark: The Expedition", "Libertalia: Winds of Galecrest", "Lisboa",
    "Marrakech", "Meadow", "Millennium Blades", "Mindbug: First Contact",
    "Near and Far", "Nemo's War (Second Edition)", "New York Zoo", "Newton",
    "Neuroshima Hex! 3.0", "Nova Luna", "Orléans",
    "Paladins of the West Kingdom", "Paleo", "PARKS", "Point Salad", "Port Royal",
    "Project L", "Quacks of Quedlinburg", "Rajas of the Ganges", "Railways of the World",
    "Ready Set Bet", "Red Rising", "Robinson Crusoe: Adventures on the Cursed Island",
    "Roll Player", "Scythe", "Secret Hitler", "Smartphone Inc.", "Steampunk Rally",
    "Stockpile", "Stone Age", "Struggle of Empires", "Suburbia", "Sword & Sorcery",
    "Tang Garden", "Tapestry", "Tekhenu: Obelisk of the Sun",
    "Teotihuacan: City of Gods", "Terra Mystica", "The Castles of Tuscany",
    "The Crew: The Quest for Planet Nine", "The Gallerist", "The King's Dilemma",
    "The Red Cathedral", "The Shipwreck Arcana", "The Taverns of Tiefenthal",
    "Tichu", "Village", "Vinhos: Deluxe Edition", "Viscounts of the West Kingdom",
    "Viticulture Essential Edition", "Watergate", "Whistle Mountain", "Wingspan",
    "Witchstone", "Zooloretto",
]

SOURCES["Yucata"] = [
    "A Few Acres of Snow", "Antike Duellum", "Arkadia", "Attika", "Automobiles",
    "Balloon Cup", "Black Friday", "Bonfire", "Bruges", "Cacao",
    "Campaign Manager 2008", "Carcassonne: Hunters and Gatherers",
    "Carcassonne: South Seas", "Carpe Diem", "Carolus Magnus", "Carson City",
    "Cartographers", "Chakra", "CuBirds", "Discordia", "Egizia", "El Grande",
    "Fearsome Floors", "Fields of Arle", "Finca", "Firenze",
    "First Class: All Aboard the Orient Express!", "Forum Trajanum",
    "Founding Fathers", "Glen More", "Grand Austria Hotel", "Guildhall",
    "Hacienda", "Hadara", "Hawaii", "Helios", "Hey, That's My Fish!", "Imhotep",
    "Imhotep: The Duel", "Industrial Waste", "Innovation",
    "Kashgar: Merchants of the Silk Road", "Key Harvest", "Keyper",
    "König von Siam", "Kraftwagen", "La Granja", "La Granja: No Siesta",
    "La Isla", "Las Vegas", "Lift Off", "Luna", "Macao", "Machi Koro", "Masons",
    "Messina 1347", "Mottainai", "Mountain Goats", "Murano", "Mystic Vale",
    "Nations: The Dice Game", "Nauticus", "Navegador", "Newton", "NMBR 9",
    "On the Underground: London/Berlin", "Oregon", "Paris: La Cité de la Lumière",
    "Pax Porfiriana", "Pergamon", "Polis: Fight for the Hegemony",
    "Praga Caput Regni", "Rajas of the Ganges",
    "Rajas of the Ganges: The Dice Charmers", "Red7", "Renature", "Roam",
    "Russian Railroads", "Sagani", "Saint Petersburg", "San Juan (Second Edition)",
    "Santa Monica", "Santiago de Cuba", "Sekigahara: The Unification of Japan",
    "Skymines", "Snowdonia", "Sobek", "SteamRollers", "Stone Age", "Targi",
    "The Castles of Burgundy", "The Castles of Burgundy: The Card Game",
    "The Downfall of Pompeii", "The Hanging Gardens", "The Oracle of Delphi",
    "The Palaces of Carrara", "The Red Cathedral", "The Rose King",
    "The Speicherstadt", "The Taverns of Tiefenthal", "Thunderstone",
    "Thurn and Taxis", "To Court the King", "Torres", "Transatlantic", "Ulm",
    "Underwater Cities", "Valletta", "Vikings", "Villagers", "Vinci", "Völuspá",
    "War Chest", "Yspahan", "Zooloretto",
]

SOURCES["Steam"] = [
    "Agricola", "Ark Nova", "Between Two Castles of Mad King Ludwig", "Blood Rage",
    "Brass", "Brass: Birmingham", "Calico", "Cascadia", "Caverna",
    "Charterstone", "Clank!", "Concordia", "Cottage Garden", "Eclipse",
    "Eclipse: Second Dawn for the Galaxy", "Everdell", "Evergreen",
    "Evolution", "Fury of Dracula", "Gaia Project", "Galaxy Trucker",
    "Gloomhaven", "Gloomhaven: Jaws of the Lion", "Isle of Skye", "Istanbul",
    "Kingdomino", "Lorenzo il Magnifico", "Memoir '44", "Mindbug",
    "Mint Works", "Mysterium", "Mystic Vale", "One Deck Dungeon", "Patchwork",
    "Point Salad", "Power Grid", "Raiders of the North Sea", "Roll for the Galaxy",
    "Root", "Sagrada", "Small World", "Spirit Island", "Splendor",
    "Stockpile", "Talisman", "Takenoko", "Terraforming Mars", "That's Pretty Clever",
    "The Castles of Burgundy", "The Fox in the Forest", "The Isle of Cats",
    "Through the Ages", "Ticket to Ride", "Tokaido", "Twilight Struggle",
    "Unmatched", "Viticulture", "Wingspan", "Yellow & Yangtze",
]

# Spiel des Jahres nominees and winners (1979–2025)
# German/English names normalized to English where available
SOURCES["Spiel des Jahres"] = [
    # 1979–1985 (partial)
    "Hare and Tortoise", "Rummikub", "Focus", "Enchanted Forest", "Scotland Yard",
    "Railway Rivals", "Sherlock Holmes: Consulting Detective",
    # 1998
    "Elfenland",
    # 1999
    "Tikal", "Union Pacific",
    # 2000
    "Torres", "Carolus Magnus", "Citadels",
    # 2001
    "Carcassonne", "Troia",
    # 2002
    "Villa Paletti", "Puerto Rico", "TransAmerica",
    # 2003
    "Alhambra", "Clans",
    # 2004
    "Ticket to Ride", "Ingenious", "Saint Petersburg",
    # 2005
    "Niagara", "That's Life!", "Jambo",
    # 2006
    "Thurn and Taxis", "Shadows over Camelot", "Caylus",
    # 2007
    "Zooloretto", "Thebes", "Yspahan",
    # 2008
    "Keltis", "Stone Age", "Agricola",
    # 2009
    "Dominion", "FITS", "Finca", "Fauna", "Pandemic",
    # 2010
    "Dixit", "Roll Through the Ages: The Bronze Age", "Fresco",
    # 2011
    "Qwirkle", "Asara", "Forbidden Island",
    "7 Wonders", "Strasbourg", "Lancaster",
    # 2012
    "Kingdom Builder", "Las Vegas", "Village", "Targi",
    # 2013
    "Hanabi", "Qwixx",
    "Legends of Andor", "Bruges", "The Palaces of Carrara",
    # 2014
    "Camel Up", "Concept", "Splendor",
    "Istanbul", "Concordia",
    # 2015
    "Colt Express", "Machi Koro",
    "Broom Service", "Orléans",
    # 2016
    "Codenames", "Imhotep", "Karuba",
    "Isle of Skye", "Pandemic Legacy: Season 1", "T.I.M.E Stories",
    # 2017
    "Kingdomino", "Magic Maze", "The Quest for El Dorado",
    "Exit: The Game", "Raiders of the North Sea", "Terraforming Mars",
    # 2018
    "Azul", "Luxor", "The Mind",
    "The Quacks of Quedlinburg", "Heaven & Ale",
    # 2019
    "Just One", "L.L.A.M.A.",
    "Wingspan", "Carpe Diem", "Detective: A Modern Crime Board Game",
    # 2020
    "Pictures", "My City", "Nova Luna",
    "The Crew: The Quest for Planet Nine", "Cartographers", "The King's Dilemma",
    # 2021
    "MicroMacro: Crime City", "Zombie Teenz Evolution",
    "Paleo", "Lost Ruins of Arnak", "Fantasy Realms",
    # 2022
    "Cascadia", "Scout", "Top Ten",
    "Living Forest", "Cryptid", "Dune: Imperium",
    # 2023
    "Dorfromantik: The Board Game", "Fun Facts", "Next Station: London",
    "Challengers!", "Iki", "Planet Unknown",
    # 2024
    "Sky Team", "Daybreak",
    "The Guild of Merchant Explorers", "Ticket to Ride Legacy: Legends of the West",
    # 2025
    "Bomb Busters", "Flip 7",
    "Faraway",
]

SOURCES["18xx.games"] = [
    "1830: Railways & Robber Barons", "1846: The Race for the Midwest",
    "1849: The Game of Sicilian Railways",
    "1856: Railroading in Upper Canada from 1856",
    "1860: Railways on the Isle of Wight",
    "1862: Railway Mania in the Eastern Counties",
    "1870: Railroading Across the Trans Mississippi from 1870",
    "18Chesapeake", "18CZ", "Shikoku 1889",
]

SOURCES["Brettspielwelt"] = [
    "6 nimmt!", "7 Wonders", "Carcassonne", "Catan", "Caylus",
    "Discordia", "Eclipse", "Kingdom Builder", "Power Grid",
    "The Princes of Florence", "The Voyages of Marco Polo",
]


# ---------------------------------------------------------------------------
# Matching logic (same as compare_bga.py)
# ---------------------------------------------------------------------------

def transliterate(name):
    name = name.lower()
    name = re.sub(r'[àáâãäå]', 'a', name)
    name = re.sub(r'[èéêë]', 'e', name)
    name = re.sub(r'[ìíîï]', 'i', name)
    name = re.sub(r'[òóôõöō]', 'o', name)
    name = re.sub(r'[ùúûü]', 'u', name)
    name = re.sub(r'[ýÿ]', 'y', name)
    name = re.sub(r'[ñ]', 'n', name)
    name = re.sub(r'[ß]', 'ss', name)
    name = re.sub(r'[řŗ]', 'r', name)
    name = re.sub(r'[čć]', 'c', name)
    name = re.sub(r'[šś]', 's', name)
    return name


def normalize(name):
    s = transliterate(name)
    s = re.sub(r'\s*&\s*', ' and ', s)
    s = re.sub(r"[''`]", '', s)
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'^(the|a|an) ', '', s)
    return s


def main_title_of(name):
    for sep in [':', ' - ', ' – ']:
        if sep in name:
            part = name.split(sep)[0].strip()
            if len(part) > 3:
                return normalize(part)
    return normalize(name)


HAS_SUBTITLE = re.compile(r'[:\u2013\u2014]| - ')


def build_master_index(master_games):
    full = {}
    main = {}
    for name in master_games:
        n = normalize(name)
        full[n] = name
        m = main_title_of(name)
        if m not in main:
            main[m] = name
    return full, main


def find_in_master(game_name, master_games, full_idx, main_idx):
    if game_name in master_games:
        return game_name, master_games[game_name]
    n = normalize(game_name)
    if n in full_idx:
        name = full_idx[n]
        return name, master_games[name]
    if not HAS_SUBTITLE.search(game_name):
        if n in main_idx:
            name = main_idx[n]
            return name, master_games[name]
    return None


def name_to_slug(name):
    s = transliterate(name)
    s = re.sub(r"'", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def load_master_list(path):
    games = {}
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            games[row['name'].strip()] = row
    return games


def load_yaml_slugs(games_dir):
    return {f.stem for f in Path(games_dir).glob('*.yaml')}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import sys
    base = Path(__file__).parent.parent
    master_games = load_master_list(base / 'master_list.csv')
    yaml_slugs = load_yaml_slugs(base / 'games')

    master_yaml_ids = {}
    for name, row in master_games.items():
        yid = row.get('yaml_id', '').strip()
        master_yaml_ids[name] = yid if yid else name_to_slug(name)

    full_idx, main_idx = build_master_index(master_games)

    # For each source game: check if in DB, in master only, or missing entirely
    # Track: source_name -> {in_db, in_master_only, missing}
    source_stats = {}
    # For missing games: game_name -> set of sources that list it
    missing_games = defaultdict(set)   # canonical_name -> set of source names
    missing_in_master = defaultdict(set)  # in master list but no YAML

    for source_name, game_list in SOURCES.items():
        stats = {"in_db": 0, "in_master_only": 0, "missing": 0, "total": len(game_list)}
        for game in game_list:
            match = find_in_master(game, master_games, full_idx, main_idx)
            if match:
                master_name, row = match
                yaml_id = master_yaml_ids[master_name]
                if yaml_id in yaml_slugs:
                    stats["in_db"] += 1
                else:
                    stats["in_master_only"] += 1
                    missing_in_master[game].add(source_name)
            else:
                stats["missing"] += 1
                missing_games[game].add(source_name)
        source_stats[source_name] = stats

    # --- Summary by source ---
    print("=" * 70)
    print("COVERAGE BY SOURCE")
    print("=" * 70)
    print(f"{'Source':<35} {'Total':>6} {'In DB':>6} {'Master':>7} {'Missing':>8} {'%':>5}")
    print("-" * 70)
    for source_name, s in source_stats.items():
        pct = 100 * s["in_db"] / s["total"] if s["total"] else 0
        print(f"{source_name:<35} {s['total']:>6} {s['in_db']:>6} {s['in_master_only']:>7} {s['missing']:>8} {pct:>4.0f}%")

    total_unique = len(missing_games) + len(missing_in_master)
    print(f"\nUnique games missing from DB entirely: {len(missing_games)}")
    print(f"In master list but no YAML:            {len(missing_in_master)}")

    # --- Games missing from DB, ranked by number of sources ---
    print("\n" + "=" * 70)
    print("MISSING GAMES (ranked by source count)")
    print("=" * 70)
    ranked = sorted(missing_games.items(), key=lambda x: (-len(x[1]), x[0]))
    for game, sources in ranked:
        src_str = ", ".join(sorted(sources))
        print(f"  [{len(sources)}] {game}  ({src_str})")

    # --- Games in master list only ---
    if missing_in_master:
        print("\n" + "=" * 70)
        print("IN MASTER LIST BUT NO YAML (easy wins)")
        print("=" * 70)
        for game, sources in sorted(missing_in_master.items()):
            src_str = ", ".join(sorted(sources))
            print(f"  {game}  ({src_str})")

    # --- Per-source breakdown of missing games ---
    if "--by-source" in sys.argv:
        for source_name, game_list in SOURCES.items():
            missing = []
            for game in game_list:
                match = find_in_master(game, master_games, full_idx, main_idx)
                if not match:
                    missing.append(game)
                elif master_yaml_ids[match[0]] not in yaml_slugs:
                    missing.append(f"{game} [master only]")
            if missing:
                print(f"\n--- {source_name} ({len(missing)} missing) ---")
                for g in missing:
                    print(f"  {g}")


if __name__ == '__main__':
    main()
