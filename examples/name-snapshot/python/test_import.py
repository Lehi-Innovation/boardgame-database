"""Runs the real management command against an in-memory illustrative database."""
import hashlib
from io import StringIO
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from unittest.mock import patch

import django
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection

settings.configure(INSTALLED_APPS=["catalog_example"], DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}, DEFAULT_AUTO_FIELD="django.db.models.BigAutoField")
django.setup()
from catalog_example.models import CatalogLink, CollectionItem, Game  # noqa: E402

with connection.schema_editor() as editor:
    for model in [Game, CatalogLink, CollectionItem]:
        editor.create_model(model)

fixture, schema = map(Path, sys.argv[1:])


def run(directory, mapping=None):
    kwargs = dict(checksum=str(directory / "snapshot.sha256"), schema=str(schema), stdout=StringIO())
    if mapping:
        kwargs["mapping"] = str(mapping)
    call_command("import_catalog_names", str(directory / "snapshot.json"), **kwargs)


existing = Game.objects.create(title="007", publisher="App-owned publisher")
item = CollectionItem.objects.create(game=existing)
try:
    run(fixture)
    raise AssertionError("Existing title must need explicit mapping")
except CommandError:
    assert Game.objects.count() == 1 and CatalogLink.objects.count() == 0

with TemporaryDirectory(prefix="django-names-") as temp:
    temp = Path(temp)
    mapping = temp / "mapping.json"
    mapping.write_text(json.dumps({"legacy_yaml:007": existing.pk}))
    run(fixture, mapping)
    before = dict(CatalogLink.objects.values_list("source_id", "game_id"))
    run(fixture, mapping)
    assert before == dict(CatalogLink.objects.values_list("source_id", "game_id"))
    assert Game.objects.count() == len(before)
    existing.refresh_from_db()
    item.refresh_from_db()
    assert existing.publisher == "App-owned publisher" and item.game_id == existing.pk
    assert CatalogLink.objects.get(source_id="legacy_yaml:007").aliases == ["Double Seven"]
    assert Game.objects.filter(title="Synthetic Twin").count() == 2

    # A mid-transaction failure rolls back an already applied title change.
    changed = json.loads((fixture / "snapshot.json").read_text())
    changed["records"][0]["title"] = "Changed Seven"
    raw = json.dumps(changed).encode()
    (temp / "snapshot.json").write_bytes(raw)
    (temp / "snapshot.sha256").write_text(hashlib.sha256(raw).hexdigest() + "  snapshot.json\n")
    original_save = CatalogLink.save
    calls = [0]

    def fail_second(link, *args, **kwargs):
        calls[0] += 1
        if calls[0] == 2:
            raise RuntimeError("Synthetic failure after first write")
        return original_save(link, *args, **kwargs)

    with patch.object(CatalogLink, "save", fail_second):
        try:
            run(temp)
            raise AssertionError("Must roll back")
        except CommandError:
            pass
    existing.refresh_from_db()
    assert existing.title == "007"
    assert before == dict(CatalogLink.objects.values_list("source_id", "game_id"))

    # A smaller subsequent feed retains missing games and application references.
    changed["records"] = changed["records"][1:]
    changed["counts"]["records"] -= 1
    changed["counts"]["source_files"] -= 1
    changed["counts"]["aliases"] -= 1
    raw = json.dumps(changed).encode()
    (temp / "snapshot.json").write_bytes(raw)
    (temp / "snapshot.sha256").write_text(hashlib.sha256(raw).hexdigest() + "  snapshot.json\n")
    run(temp)
    assert before == dict(CatalogLink.objects.values_list("source_id", "game_id"))
    assert CollectionItem.objects.get(pk=item.pk).game_id == existing.pk

print(f"Django {django.get_version()}: explicit mapping, repeat IDs, associations, enrichment, missing rows and rollback passed")
