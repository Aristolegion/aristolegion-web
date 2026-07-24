-- 0008_concepts_bootstrap.sql
--
-- ES-009: Concepts and Topic Taxonomy. Populates the `concepts` table
-- (created empty by 0003_knowledge_graph_schema.sql, explicitly deferred
-- by 0005_graph_bootstrap.sql / ES-007) with the Concepts directly
-- evidenced by the current corpus, per RFC-003 Amendment 1 ("a Topic
-- organizes knowledge, a Concept represents knowledge"), plus the
-- graph_edges connecting them into the existing Knowledge Graph.
--
-- SOURCE OF TRUTH — every value below was queried live from production
-- immediately before this migration was written (not derived from static
-- files or prior session state): `essays`, `publications`, `principles`,
-- `topics` tables. No content is authored, paraphrased into new
-- terminology, or invented — every Concept title and summary is drawn
-- directly from its source's own wording.
--
-- SCOPE — no new node types, no new relationship types, no schema
-- changes. Only `concepts` rows and `graph_edges` rows using relationship
-- types already seeded in `edge_type_definitions` (0003).
--
-- TWO VOCABULARY CONSTRAINTS GOVERNED WHAT COULD BE EXPRESSED HERE,
-- stated once rather than repeated per edge:
--   1. `explains`/`references`/`supports` all restrict
--      applicable_source_types to [essay, publication] only — Manifesto,
--      Frameworks, and Principles can never source an edge to a Concept
--      under the current vocabulary. Manifesto's textual echo of
--      "information abundance" (its "Origin" section) is corroborating
--      evidence for Concept 1 below, not a graph edge — the same
--      isolated-node class of constraint ES-008B's GRAPH INTEGRATION NOTE
--      already documented for the Manifesto node itself.
--   2. No relationship type has `topic` as an applicable_target_type
--      except `belongs_to` (source: concept only) — Publications and
--      Essays can never link directly to a Topic; Topics are reachable in
--      the graph only through a Concept's `belongs_to` edge.
--
-- CONCEPTS ACCEPTED (4) — each directly evidenced, verbatim-titled:
--   - Information Abundance (essay judgment-in-the-age-of-information-
--     abundance)
--   - The Proxy Problem (essay capability-over-credentials)
--   - Deep Work (essay the-return-of-deep-work)
--   - Intelligence Is Becoming Abundant (publication the-judgment-economy,
--     its own key_insights[0].title, verbatim)
--
-- CONCEPTS CONSIDERED AND EXCLUDED, not silently dropped:
--   - "Judgment as a Trainable Discipline" (essay 1) and "Capability >
--     Credentials" (essay 2 / the Capability Dividend publication) are
--     materially identical to the existing philosophy-of-judgment /
--     philosophy-of-capability Principles' own text — expressed instead
--     as direct essay/publication -> principle `supports` edges below,
--     not duplicated as new Concepts.
--   - "The Glass Partition" — reflective fiction, not an expository
--     document; `explains` requires "the document's primary subject" in
--     the discursive-claim sense edge_type_definitions describes. No
--     Concept extracted from it.
--   - "Talent Deficit" (Employability Fracture publication) — one
--     sentence, no elaboration anywhere (intelligence_brief etc. are
--     null on that row). Insufficient evidentiary depth.
--   - "The Future Belongs To Augmented Thinkers" (Judgment Economy's 3rd
--     key_insight) — one unelaborated sentence, not cross-referenced
--     elsewhere in the corpus.
--   - Framework step-words (e.g. "Context Intelligence") — internal to a
--     Framework's own `operationalizes` structure per
--     edge_type_definitions' own description, not independently
--     explained elsewhere.
--
-- RELATIONSHIP EDGES (11) — see the ES-009 Repository Inspection Report /
-- PR body for the full evidence-to-edge mapping. All `supports` edges
-- carry confidence = null ("not yet scored," per 0003's own documented
-- convention for confidence_aware types — not zero); no confidence-
-- scoring methodology exists in this migration's scope.
--
-- No essay/publication/principle/topic row referenced below is modified
-- — this migration only inserts into `concepts` (previously empty) and
-- `graph_edges` (previously containing only 2 unrelated `introduces`
-- rows), using slug-based lookups rather than hardcoded UUIDs so it does
-- not depend on transcribing IDs correctly by hand.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   DELETE FROM public.graph_edges WHERE relationship_type IN ('explains', 'supports', 'belongs_to');
--   DELETE FROM public.concepts WHERE slug IN (
--     'information-abundance',
--     'the-proxy-problem',
--     'deep-work',
--     'intelligence-is-becoming-abundant'
--   );
--   COMMIT;
--
-- Safe: prior to this migration, `explains`, `supports`, and `belongs_to`
-- all had zero rows in graph_edges (confirmed live before this file was
-- written — the only 2 existing rows are both `introduces`), and
-- `concepts` was empty, so this rollback returns both tables to that
-- exact prior state. This migration and the above rollback were validated
-- together in a single, uncommitted transaction against production before
-- this file was written — an earlier draft of this rollback omitted
-- `belongs_to` and was caught by that validation leaving 3 orphaned edges
-- behind, corrected before this file reached its final form; see the
-- ES-009 completion report / PR body for the full validation transcript.

BEGIN;

-- -----------------------------------------------------------------------
-- Concepts
-- -----------------------------------------------------------------------

insert into concepts (title, slug, summary) values
  (
    'Information Abundance',
    'information-abundance',
    'The proliferation of accessible information has not resolved the need for judgment — it has made judgment the scarcer, more valuable capability.'
  ),
  (
    'The Proxy Problem',
    'the-proxy-problem',
    'Credentials functioned as a scarce, reliable proxy for capability; that scarcity has broken down, and the proxy no longer reliably signals capability.'
  ),
  (
    'Deep Work',
    'deep-work',
    'Sustained, undistracted attention is a trained capacity that compounds into a scarce competitive advantage as fragmented, shallow work is automated away.'
  ),
  (
    'Intelligence Is Becoming Abundant',
    'intelligence-is-becoming-abundant',
    'As artificial intelligence reduces the cost of information, analysis, and creation, advantage shifts from accessing intelligence to applying judgment to it.'
  );

-- -----------------------------------------------------------------------
-- Graph edges
-- -----------------------------------------------------------------------

-- 1. essay -> explains -> concept (Information Abundance)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'essay', e.id, 'concept', c.id, 'explains', null
from essays e, concepts c
where e.slug = 'judgment-in-the-age-of-information-abundance'
  and c.slug = 'information-abundance';

-- 2. concept -> belongs_to -> topic (Information Abundance -> Judgment)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'concept', c.id, 'topic', t.id, 'belongs_to', null
from concepts c, topics t
where c.slug = 'information-abundance'
  and t.slug = 'judgment';

-- 3. essay -> supports -> principle (essay 1 -> Philosophy of Judgment)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'essay', e.id, 'principle', p.id, 'supports', null
from essays e, principles p
where e.slug = 'judgment-in-the-age-of-information-abundance'
  and p.slug = 'philosophy-of-judgment';

-- 4. essay -> explains -> concept (The Proxy Problem)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'essay', e.id, 'concept', c.id, 'explains', null
from essays e, concepts c
where e.slug = 'capability-over-credentials'
  and c.slug = 'the-proxy-problem';

-- 5. concept -> belongs_to -> topic (The Proxy Problem -> Human Capability)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'concept', c.id, 'topic', t.id, 'belongs_to', null
from concepts c, topics t
where c.slug = 'the-proxy-problem'
  and t.slug = 'human-capability';

-- 6. essay -> supports -> principle (essay 2 -> Philosophy of Capability)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'essay', e.id, 'principle', p.id, 'supports', null
from essays e, principles p
where e.slug = 'capability-over-credentials'
  and p.slug = 'philosophy-of-capability';

-- 7. essay -> explains -> concept (Deep Work) — no belongs_to edge: no
-- Topic is directly evidenced as a fit for this concept.
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'essay', e.id, 'concept', c.id, 'explains', null
from essays e, concepts c
where e.slug = 'the-return-of-deep-work'
  and c.slug = 'deep-work';

-- 8. publication -> explains -> concept (Intelligence Is Becoming Abundant)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'publication', pub.id, 'concept', c.id, 'explains', null
from publications pub, concepts c
where pub.slug = 'the-judgment-economy'
  and c.slug = 'intelligence-is-becoming-abundant';

-- 9. concept -> belongs_to -> topic (Intelligence Is Becoming Abundant -> Judgment)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'concept', c.id, 'topic', t.id, 'belongs_to', null
from concepts c, topics t
where c.slug = 'intelligence-is-becoming-abundant'
  and t.slug = 'judgment';

-- 10. publication -> supports -> principle (Judgment Economy -> Philosophy of Judgment)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'publication', pub.id, 'principle', p.id, 'supports', null
from publications pub, principles p
where pub.slug = 'the-judgment-economy'
  and p.slug = 'philosophy-of-judgment';

-- 11. publication -> supports -> principle (Capability Dividend pub -> Philosophy of Capability)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'publication', pub.id, 'principle', p.id, 'supports', null
from publications pub, principles p
where pub.slug = 'aristolegion-intelligence-journal-the-capability-dividend'
  and p.slug = 'philosophy-of-capability';

COMMIT;
