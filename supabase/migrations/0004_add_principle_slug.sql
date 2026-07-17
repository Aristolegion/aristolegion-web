-- 0004_add_principle_slug.sql
--
-- Adds a stable slug to public.principles (introduced empty, without a
-- slug, in 0003_knowledge_graph_schema.sql / ES-006).
--
-- CONTEXT — this migration exists because of an architectural review
-- finding during ES-007 (Knowledge Graph Bootstrap): Task 4 of that
-- specification requires every Principle to have a stable slug, but
-- 0003's `principles` table has no slug column — every other first-class
-- Knowledge Graph node (concepts, topics, frameworks) already has one.
-- A first-class node needs a stable identifier from its initial
-- introduction; since 0003 is already merged, the correct fix is a new,
-- forward-numbered migration that adds it — not editing 0003 in place,
-- and not working around the gap in application-level bootstrap data.
-- This preserves the migration-first discipline established in ES-001:
-- numbers are never reused, and history is never rewritten to "undo" or
-- "correct" a merged migration.
--
-- Applied as three separate statements deliberately (add nullable column,
-- backfill, then enforce NOT NULL + UNIQUE) even though `principles` is
-- empty in production as of this migration — this is the safe general
-- pattern for adding a required column to a table that might already
-- hold rows, and establishes that convention now rather than only when
-- it's strictly necessary.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   ALTER TABLE public.principles DROP CONSTRAINT IF EXISTS principles_slug_key;
--   ALTER TABLE public.principles DROP COLUMN IF EXISTS slug;
--   COMMIT;
--
-- Safe: as of this migration, `principles` has no rows in production (ES-006
-- has not been applied yet, and no prior migration has inserted any), so
-- dropping the column loses no data. If this migration is reversed after
-- 0005_graph_bootstrap.sql has run and populated real rows, dropping the
-- slug column would lose the human-readable identifiers on those rows —
-- their `id` (uuid) would remain the only stable identifier, exactly the
-- gap this migration exists to close. Both this migration and its rollback
-- were validated together with 0003 and 0005 in a single, uncommitted
-- transaction before this file was written — see the ES-007 completion
-- report / PR body for the validation transcript.

BEGIN;

alter table principles add column slug text;

-- Backfill: principles is empty in production as of this migration —
-- neither 0003 (ES-006's schema) nor 0005 (the bootstrap data that will
-- populate real principles) has been applied to production yet, so there
-- is no existing data to backfill. This UPDATE is a no-op today; it
-- documents the safe pattern for any future table-with-existing-rows case
-- rather than assuming this table will always be empty when a similar
-- migration is written.
update principles set slug = id::text where slug is null;

alter table principles alter column slug set not null;
alter table principles add constraint principles_slug_key unique (slug);

COMMIT;
