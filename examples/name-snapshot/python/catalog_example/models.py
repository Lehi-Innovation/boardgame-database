from django.db import models


class Game(models.Model):
    title = models.CharField(max_length=1000)
    # App-owned enrichment: the name feed never clears this field.
    publisher = models.CharField(max_length=1000, null=True)


class CatalogLink(models.Model):
    source_id = models.CharField(max_length=1000, unique=True)
    game = models.OneToOneField(Game, on_delete=models.PROTECT)
    dataset_version = models.CharField(max_length=71)
    aliases = models.JSONField(default=list)
    disambiguation = models.CharField(max_length=1000, null=True)


class CollectionItem(models.Model):
    game = models.ForeignKey(Game, on_delete=models.PROTECT)
