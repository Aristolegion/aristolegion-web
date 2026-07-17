-- 0005_graph_bootstrap.sql
--
-- ES-007: Knowledge Graph Bootstrap. Populates the Knowledge Graph schema
-- (ES-006, migration 0003_knowledge_graph_schema.sql, plus
-- 0004_add_principle_slug.sql) with the foundational intellectual entities
-- that already exist in the Aristolegion repository and production
-- database. This migration assumes 0003 and 0004 are already applied to
-- the target database — production deployment sequencing across all three
-- migrations is a separate operational step outside this specification's
-- scope, per CTO direction.
--
-- Scope: Frameworks, Principles, Topics, and the initial graph_edges
-- directly supported by existing content, per ES-007 Tasks 1-5. No
-- Concepts (explicitly deferred to a later spec). No application code, no
-- APIs, no UI, no schema changes (0004 already carries the one schema
-- change ES-007's review required — this migration is data-only).
--
-- SOURCE OF TRUTH — every value below is copied verbatim from existing
-- repository/production content, not authored fresh:
--   Frameworks:    lib/content/library.ts's `frameworks` array (title,
--                  description, status) plus steps sourced from existing,
--                  currently-rendered content where it exists (see below).
--   Topics:        lib/content/homepage.ts's `pillars` and `domains`,
--                  lib/content/essayCollections.ts,
--                  lib/content/founderResearchInterests.ts.
--   Principles:    lib/content/manifesto.ts's `manifestoSections`.
--   graph_edges:   live `publications` rows (id, embedded `framework`
--                  jsonb) cross-referenced against the Frameworks above.
--
-- RENUMBERING NOTE — this migration was originally written and reviewed
-- as 0004_graph_bootstrap.sql. Review surfaced that Task 4 (a stable slug
-- per Principle) could not be satisfied by 0003's schema as merged.
-- Rather than edit the already-merged 0003 in place, the fix was made as
-- a new, forward-numbered migration (0004_add_principle_slug.sql), and
-- this bootstrap migration was renumbered to 0005 to make room for it —
-- preserving the migration-first discipline established in ES-001 (never
-- reuse numbers, never rewrite merged history).
--
-- DEFERRED, not bootstrapped in this migration (see completion report for
-- full reasoning on each):
--   - Concepts (Task 1 explicitly excludes them).
--   - Manifesto -> Principle edges (no `manifesto` table/node exists yet;
--     per CTO direction, deferred rather than widening this spec's scope).
--   - authored_by edges (no `founder` table/node exists yet either — same
--     class of gap as Manifesto, applied consistently).
--   - Framework -> operationalizes -> Principle edges (Task 5's own
--     example; no existing content *directly* asserts a specific
--     Framework-to-Principle connection, and Task 5 requires "only
--     relationships directly supported by existing content, do not
--     infer" — a thematic resemblance is not the same as a stated
--     relationship, so none are created here).
--   - Manifesto sections "Origin" and "A Call to Reflection" (narrative
--     and reader-exhortation respectively, not assertable institutional
--     claims — not principle-shaped).
--   - Manifesto "Core Values" (a 10-item list) — whether each value
--     becomes its own atomic Principle is a real editorial granularity
--     decision this migration does not make unilaterally; deferred.
--   - "The Employability Fracture Model™" (an embedded, per-publication
--     framework from lib/content/publicationEnhancements.ts) is not one
--     of the three canonical top-level Frameworks Task 2 names as
--     examples (Capability Dividend™, Capability Flywheel™, Judgment
--     Capital™) and is not bootstrapped as its own `frameworks` row here.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   DELETE FROM graph_edges WHERE relationship_type = 'introduces';
--   DELETE FROM principles;
--   DELETE FROM topics;
--   DELETE FROM frameworks;
--   COMMIT;
--
-- Safe: this migration only inserts rows into tables that were empty
-- before it ran (per the Repository Inspection performed for ES-007), so
-- this rollback returns each table to that same empty state. This
-- migration, 0004_add_principle_slug.sql, and 0003_knowledge_graph_schema.sql
-- were all validated together in a single, uncommitted transaction (built
-- on a temporary re-creation of the full schema, since none of the three
-- are yet live in production) before this file was written — see the
-- ES-007 completion report / PR body for the validation transcript.

BEGIN;

-- -----------------------------------------------------------------------
-- Frameworks
-- -----------------------------------------------------------------------
-- Title, description, and status are copied verbatim from
-- lib/content/library.ts's `frameworks` array — the canonical, existing
-- source for these three named Frameworks. `steps` is populated only
-- where existing, currently-rendered content actually provides a step
-- sequence for that specific framework:
--   - Capability Dividend™: lib/content/publicationEnhancements.ts's
--     "capability dividend" entry ("The Capability Dividend™ Model").
--   - Judgment Capital™: the live `publications` row "The Judgment
--     Economy™" (id 610f6ea4-d14c-4d9f-bc41-6046205d0c38), whose embedded
--     `framework` jsonb column already holds "The Judgment Capital™
--     Model" with these exact steps.
--   - Capability Flywheel™: no existing content anywhere provides a step
--     sequence for this framework, so `steps` is left null rather than
--     invented.
-- Status is left exactly as the static source declares it (Published /
-- Research Development) — not inferred or upgraded from the fact that a
-- related publication happens to be published.

insert into frameworks (title, slug, description, status, steps) values
  (
    'Capability Dividend™',
    'capability-dividend',
    'A framework exploring the transition from knowledge accumulation to capability creation.',
    'Published',
    '["Knowledge", "Skill", "Judgment", "Capability", "Impact"]'::jsonb
  ),
  (
    'Capability Flywheel™',
    'capability-flywheel',
    'How learning, judgment, execution, and reflection create compounding professional growth.',
    'Research Development',
    null
  ),
  (
    'Judgment Capital™',
    'judgment-capital',
    'Understanding judgment as a scarce advantage in an information-abundant world.',
    'Research Development',
    '["Information", "Understanding", "Context Intelligence", "Decision Quality", "Impact"]'::jsonb
  );

-- -----------------------------------------------------------------------
-- Topics
-- -----------------------------------------------------------------------
-- Consolidates the four duplicated static taxonomy lists RFC-002
-- identified (lib/content/homepage.ts's `pillars` and `domains`,
-- lib/content/essayCollections.ts, lib/content/founderResearchInterests.ts)
-- into one taxonomy, per Task 3.
--
-- Consolidation rule applied, stated explicitly since this is a real
-- editorial judgment call (flagged per AEP Rule 4, not decided silently):
-- two entries are treated as the same Topic only when either (a) their
-- titles are identical across lists, or (b) their titles differ but their
-- descriptions are near-verbatim the same underlying claim. Thematic
-- similarity alone (e.g., pillars' "Learning" vs. founderResearchInterests'
-- "Learning Systems") is NOT treated as sufficient evidence of duplication
-- — that would be inferring a merge the content doesn't clearly support,
-- so those are kept as separate Topics.
--
-- Applying that rule: "Human Capability", "Leadership Intelligence", and
-- "Future of Work" appear with identical titles across `domains`,
-- `essayCollections`, and `founderResearchInterests` (worded differently
-- per page, as expected editorial variation) -> one Topic each, using
-- `domains`' wording as canonical (its home, lib/content/homepage.ts, is
-- the most prominent placement). `domains`' "Human Systems" and
-- `essayCollections`' "Systems Thinking" have different titles but
-- near-identical descriptions ("environments, structures, and cultures
-- shape performance") -> consolidated into one Topic, "Human Systems".
-- `founderResearchInterests`' "Learning Systems" has a meaningfully
-- different description ("how people and organizations continuously
-- evolve") and is kept separate rather than folded into "Human Systems"
-- on positional/structural grounds alone. The six `pillars` do not
-- title-match or description-match anything in the three domain lists and
-- are kept as six separate Topics.

insert into topics (title, slug, summary) values
  ('Judgment', 'judgment', 'Decision-making beyond information.'),
  ('Capability', 'capability', 'The ability to convert knowledge into meaningful impact.'),
  ('Character', 'character', 'Strength and consistency under uncertainty.'),
  ('Learning', 'learning', 'The continuous evolution of intelligence.'),
  ('Wisdom', 'wisdom', 'Experience transformed into understanding.'),
  ('Human Excellence', 'human-excellence', 'The pursuit of higher standards.'),
  ('Human Capability', 'human-capability', 'How individuals build enduring advantage beyond skills and credentials.'),
  ('Leadership Intelligence', 'leadership-intelligence', 'How judgment, responsibility, and decision-making create meaningful impact.'),
  ('Future of Work', 'future-of-work', 'How careers, organizations, and talent systems evolve in an age of acceleration.'),
  ('Human Systems', 'human-systems', 'How environments, structures, and cultures shape performance.'),
  ('Learning Systems', 'learning-systems', 'How people and organizations continuously evolve.');

-- -----------------------------------------------------------------------
-- Principles
-- -----------------------------------------------------------------------
-- Extracted from lib/content/manifesto.ts's `manifestoSections`, per
-- Task 4. Text is copied verbatim (multi-paragraph sections joined with a
-- blank line to preserve the original paragraph structure) — not
-- paraphrased, not restructured into separate atomic claims within a
-- section. Only sections that make a clear, standalone, assertable
-- institutional claim are bootstrapped as Principles: Mission, Vision,
-- Philosophy of Judgment, Philosophy of Capability, and Human Excellence.
-- "Origin" (narrative/background) and "A Call to Reflection" (an
-- exhortation to the reader, not an institutional claim) are not
-- principle-shaped and are excluded. "Core Values" (a 10-item list) is
-- excluded pending an explicit editorial decision on whether each value
-- should become its own atomic Principle — see the completion report.
--
-- Slugs are derived directly from each manifesto section's own heading,
-- populated into the column 0004_add_principle_slug.sql added.
--
-- Note: the "human-excellence" Principle slug is deliberately the same
-- word as the "human-excellence" Topic slug seeded above. They are
-- different entities in different tables (a Principle IS a specific
-- claim; a Topic organizes/categorizes) — this is intentional, not a
-- naming collision, and demonstrates exactly the Topic-vs-Concept-style
-- distinction RFC-003 Amendment 1 established.

insert into principles (slug, text) values
  (
    'mission',
    'To help ambitious individuals develop judgment, capability, leadership, and character through research, publications, essays, frameworks, and carefully designed communities.'
  ),
  (
    'vision',
    'To become one of the world''s most respected independent intellectual institutions for judgment, capability, leadership, resilience, and human excellence — measured not by attention captured, but by capability compounded.'
  ),
  (
    'philosophy-of-judgment',
    E'Judgment compounds the way capital compounds — quietly, and only for those who invest in it deliberately. Aristolegion treats judgment not as an innate trait some people happen to have, but as a discipline that can be studied, practiced, and refined over the course of a working life.\n\nWhere most institutions optimize for information transfer, Aristolegion optimizes for judgment transfer: the capacity to weigh evidence, resist noise, and act well under uncertainty.'
  ),
  (
    'philosophy-of-capability',
    'Capability, not credentials, is the last durable competitive advantage available to any individual or institution. Degrees and certifications are proxies; they were never the substance. Aristolegion exists to help close the distance between the two — restoring a reliable signal between what people can actually do and how that capability is recognized.'
  ),
  (
    'human-excellence',
    E'Human excellence is not a single achievement but a compounding practice — the sum of small, deliberate choices toward greater judgment, greater capability, greater leadership, and greater character, sustained over years rather than days.\n\nAristolegion measures its own success the same way: not by how much time a reader spends with its work, but by whether that reader leaves with better judgment than they arrived with.'
  );

-- -----------------------------------------------------------------------
-- Graph edges
-- -----------------------------------------------------------------------
-- Per CTO direction: use the relationship semantics RFC-003 defines, not
-- Task 5's illustrative examples literally. `introduces` is Publication ->
-- Framework only (per edge_type_definitions, seeded in ES-006); `Framework
-- -> operationalizes -> Principle` and `Manifesto -> supports -> Principle`
-- are NOT created here (the former has no directly-stated evidence, not
-- just thematic resemblance; the latter has no Manifesto node to
-- reference) — see the DEFERRED section at the top of this file.
--
-- Two edges, both directly evidenced by live production data:
--   - "Aristolegion Intelligence Journal - The Capability Dividend™"
--     (publications.id 84cfdcf8-ccea-4911-91f3-0eeec525484a) is the
--     publication lib/content/publicationEnhancements.ts's title-matched
--     fallback associates with "The Capability Dividend™ Model" —
--     introduces the Capability Dividend™ framework.
--   - "The Judgment Economy™" (publications.id
--     610f6ea4-d14c-4d9f-bc41-6046205d0c38) has "The Judgment Capital™
--     Model" as its own live, embedded `framework` jsonb value —
--     introduces the Judgment Capital™ framework.
-- No publication introduces Capability Flywheel™ — no existing content
-- connects any publication to it, so no edge is created; it exists as an
-- unlinked node in this pass, which is expected and correct, not an
-- omission. `confidence` is left null for both edges: `introduces` is not
-- a confidence-aware relationship type (per edge_type_definitions), so
-- null is the correct value, not a placeholder.

insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'publication', '84cfdcf8-ccea-4911-91f3-0eeec525484a'::uuid, 'framework', f.id, 'introduces', null
from frameworks f where f.slug = 'capability-dividend';

insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'publication', '610f6ea4-d14c-4d9f-bc41-6046205d0c38'::uuid, 'framework', f.id, 'introduces', null
from frameworks f where f.slug = 'judgment-capital';

COMMIT;
