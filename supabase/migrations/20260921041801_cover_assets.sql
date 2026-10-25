-- Assets use the existing immutable revisions, review gate and typed references.
-- Edition -> asset and asset -> edition references use the existing indexed FKs.
alter table editorial.entities drop constraint entities_entity_type_check;
alter table editorial.entities add constraint entities_entity_type_check
  check (entity_type in ('game','edition','person','organization','taxonomy','family','assessment','asset'));
