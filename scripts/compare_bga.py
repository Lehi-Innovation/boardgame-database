#!/usr/bin/env python3
"""Compare BGA game list against our database."""

import csv
import os
import re
from pathlib import Path

BGA_GAMES = [
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
    "Marrakech", "Mascarade", "Masters of Renaissance: Lorenzo il Magnifico – The Card Game",
    "Medina", "Medina (Second Edition)", "Memoir '44", "Mercado de Lisboa", "MESOS",
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


def transliterate(name):
    """Normalize unicode/accented characters to ASCII equivalents."""
    name = name.lower()
    name = re.sub(r'[àáâãäå]', 'a', name)
    name = re.sub(r'[èéêë]', 'e', name)
    name = re.sub(r'[ìíîï]', 'i', name)
    name = re.sub(r'[òóôõöō]', 'o', name)
    name = re.sub(r'[ùúûü]', 'u', name)
    name = re.sub(r'[ýÿ]', 'y', name)
    name = re.sub(r'[ñ]', 'n', name)
    name = re.sub(r'[ß]', 'ss', name)
    name = re.sub(r'[ř]', 'r', name)
    name = re.sub(r'[č]', 'c', name)
    name = re.sub(r'[š]', 's', name)
    return name


def normalize(name):
    """Normalize a game name for fuzzy matching."""
    s = transliterate(name)
    # & -> and
    s = re.sub(r'\s*&\s*', ' and ', s)
    # Strip punctuation except spaces and digits
    s = re.sub(r"[''`]", '', s)       # smart/straight apostrophes
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    # Remove leading articles
    s = re.sub(r'^(the|a|an) ', '', s)
    return s


def main_title_of(name):
    """Normalize just the main title (before subtitle separator) of a raw name."""
    # Split on subtitle separators BEFORE normalizing, so colons aren't lost
    for sep in [':', ' - ', ' – ']:
        if sep in name:
            part = name.split(sep)[0].strip()
            if len(part) > 3:
                return normalize(part)
    return normalize(name)


def load_master_list(path):
    games = {}
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['name'].strip()
            games[name] = row
    return games


def load_yaml_slugs(games_dir):
    slugs = set()
    for f in Path(games_dir).glob('*.yaml'):
        slugs.add(f.stem)
    return slugs


def name_to_slug(name):
    """Convert name to expected yaml slug."""
    s = name.lower()
    s = re.sub(r'[àáâãäå]', 'a', s)
    s = re.sub(r'[èéêë]', 'e', s)
    s = re.sub(r'[ìíîï]', 'i', s)
    s = re.sub(r'[òóôõö]', 'o', s)
    s = re.sub(r'[ùúûü]', 'u', s)
    s = re.sub(r'[ōō]', 'o', s)
    s = re.sub(r'[ý]', 'y', s)
    s = re.sub(r'[ñ]', 'n', s)
    s = re.sub(r'[ß]', 'ss', s)
    s = re.sub(r"'", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def build_master_index(master_games):
    """Build lookup dicts from normalized forms to master names."""
    full = {}    # normalized full name -> master name
    main = {}    # normalized main title -> master name (first match wins)
    for name in master_games:
        n = normalize(name)
        full[n] = name
        m = main_title_of(name)
        if m not in main:
            main[m] = name
    return full, main


HAS_SUBTITLE = re.compile(r'[:\u2013\u2014]| - ')


def find_in_master(bga_name, master_games, full_idx, main_idx):
    """Try to find a BGA game in the master list. Returns (match_name, row) or None."""
    # Exact match
    if bga_name in master_games:
        return bga_name, master_games[bga_name]

    bga_norm = normalize(bga_name)

    # Full normalized match
    if bga_norm in full_idx:
        name = full_idx[bga_norm]
        return name, master_games[name]

    # Main-title match: only when the BGA name has NO subtitle.
    # This lets "Cartographers" match "Cartographers: A Roll Player Tale",
    # but prevents "Azul: Summer Pavilion" from matching "Azul".
    bga_has_subtitle = bool(HAS_SUBTITLE.search(bga_name))
    if not bga_has_subtitle:
        bga_main = normalize(bga_name)   # already has no subtitle
        if bga_main in main_idx:
            name = main_idx[bga_main]
            return name, master_games[name]

    return None


def main():
    base = Path(__file__).parent.parent
    master_path = base / 'master_list.csv'
    games_dir = base / 'games'

    master_games = load_master_list(master_path)
    yaml_slugs = load_yaml_slugs(games_dir)

    # Build lookup: master name -> yaml slug
    master_yaml_ids = {}
    for name, row in master_games.items():
        yaml_id = row.get('yaml_id', '').strip()
        if yaml_id:
            master_yaml_ids[name] = yaml_id
        else:
            master_yaml_ids[name] = name_to_slug(name)

    full_idx, main_idx = build_master_index(master_games)

    in_db = []        # Has a YAML file
    in_master_only = []  # In master list but no YAML yet
    not_in_master = []   # Not found in master list at all

    for bga_name in BGA_GAMES:
        match = find_in_master(bga_name, master_games, full_idx, main_idx)
        if match:
            master_name, row = match
            yaml_id = master_yaml_ids[master_name]
            has_yaml = yaml_id in yaml_slugs
            if has_yaml:
                in_db.append((bga_name, master_name, yaml_id))
            else:
                status = row.get('status', '').strip()
                in_master_only.append((bga_name, master_name, yaml_id, status))
        else:
            not_in_master.append(bga_name)

    total = len(BGA_GAMES)
    print(f"BGA Games: {total}")
    print(f"In our database (YAML exists): {len(in_db)} ({100*len(in_db)/total:.0f}%)")
    print(f"In master list only (no YAML): {len(in_master_only)} ({100*len(in_master_only)/total:.0f}%)")
    print(f"Not in master list at all:     {len(not_in_master)} ({100*len(not_in_master)/total:.0f}%)")

    print("\n--- IN DATABASE (have YAML) ---")
    for bga_name, master_name, yaml_id in sorted(in_db):
        match_note = f"  [as: {master_name}]" if master_name != bga_name else ""
        print(f"  {bga_name}{match_note}")

    print("\n--- IN MASTER LIST ONLY (no YAML yet) ---")
    for bga_name, master_name, yaml_id, status in sorted(in_master_only):
        match_note = f"  [as: {master_name}]" if master_name != bga_name else ""
        status_note = f"  [{status}]" if status else ""
        print(f"  {bga_name}{match_note}{status_note}")

    print("\n--- NOT IN MASTER LIST ---")
    for bga_name in sorted(not_in_master):
        print(f"  {bga_name}")


if __name__ == '__main__':
    main()
