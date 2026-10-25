import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog_example.models import CatalogLink, Game
from read_snapshot import read_snapshot


class Command(BaseCommand):
    help = "Import a verified legacy name snapshot using stable source links"

    def add_arguments(self, parser):
        parser.add_argument("snapshot")
        parser.add_argument("--checksum", required=True)
        parser.add_argument("--schema", required=True)
        parser.add_argument("--mapping", help="Reviewed JSON object: source_id to existing integer Game.pk")

    def handle(self, *args, **options):
        try:
            snapshot, _ = read_snapshot(options["snapshot"], options["checksum"], options["schema"])
            mapping = json.loads(Path(options["mapping"]).read_text()) if options["mapping"] else {}
            source_ids = {r["source_id"] for r in snapshot["records"]}
            if (not isinstance(mapping, dict) or not set(mapping).issubset(source_ids)
                    or any(type(pk) is not int or pk <= 0 for pk in mapping.values())
                    or len(set(mapping.values())) != len(mapping)):
                raise ValueError("Mapping must use distinct existing local integer IDs and known source IDs")
            with transaction.atomic():
                for record in snapshot["records"]:
                    source_id = record["source_id"]
                    link = CatalogLink.objects.select_for_update().filter(source_id=source_id).first()
                    if link:
                        if source_id in mapping and mapping[source_id] != link.game_id:
                            raise ValueError("Mapping would replace an existing source link")
                        game = link.game
                    else:
                        if source_id in mapping:
                            game = Game.objects.select_for_update().get(pk=mapping[source_id])
                        else:
                            # Existing titles are candidates for review, never implicit identity.
                            if Game.objects.filter(title__iexact=record["title"], cataloglink__isnull=True).exists():
                                raise ValueError(f"Explicit mapping needed for {source_id}")
                            game = Game.objects.create(title=record["title"])
                        link = CatalogLink(source_id=source_id, game=game)
                    game.title = record["title"]
                    game.save(update_fields=["title"])
                    link.aliases = record["aliases"]
                    link.disambiguation = record["disambiguation"]
                    link.dataset_version = snapshot["dataset_version"]
                    link.save()
                # Missing source rows are retained, including all app associations.
        except Exception as error:
            raise CommandError(str(error)) from error
        self.stdout.write(f"Imported {len(snapshot['records'])} source links")
