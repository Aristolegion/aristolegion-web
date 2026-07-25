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
-- CONCEPTS ACCEPTED (3) — each directly evidenced, verbatim-titled:
--   - Information Abundance (essay judgment-in-the-age-of-information-
--     abundance)
--   - The Proxy Problem (essay capability-over-credentials)
--   - Deep Work (essay the-return-of-deep-work)
--
-- A 4th candidate, "Intelligence Is Becoming Abundant" (publication
-- the-judgment-economy, key_insights[0].title), was drafted and then
-- rejected on ontology review before this migration reached its final
-- form:
--   - Structural: key_insights is a 3-entry array on one row, each entry
--     an equally-unelaborated title + one-sentence description. Entry
--     [0] was accepted while entry [2] was excluded for being "one
--     unelaborated sentence" — an inconsistent standard, since entry [0]
--     is exactly as unelaborated. Entry [1] was not addressed at all in
--     the original exclusion list (a silent drop); it is added below.
--   - Substantive: its content — abundant intelligence shifting
--     advantage to judgment — is the same claim as the already-accepted
--     Information Abundance concept, just with "intelligence" swapped
--     for "information." The publication's own `central_question` and
--     `intelligence_brief` restate that same thesis, which is stronger
--     evidence for a publication -> explains -> concept(information-
--     abundance) edge than for a second, duplicate Concept node.
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
--   - "Intelligence Is Becoming Abundant" (Judgment Economy's 1st
--     key_insight) — see rejection rationale above; duplicate of
--     Information Abundance.
--   - "Judgment Becomes The Differentiator" (Judgment Economy's 2nd
--     key_insight) — one unelaborated sentence, sibling in the same
--     key_insights array as the two entries above, same depth problem;
--     substantively a restatement of the judgment-scarcity theme already
--     carried by Information Abundance and philosophy-of-judgment.
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
-- Deep Work carries a `belongs_to` edge to topic `future-of-work`: the
-- essay's own second section ("Why Depth Is Becoming a Competitive
-- Advantage") is directly about automation absorbing shallow work, which
-- is a near-exact match for that topic's own summary ("how careers...
-- evolve in an age of acceleration"). This is a directly-evidenced fit,
-- not a forced one.
--
-- No essay/publication/principle/topic row referenced below is modified
-- — this migration only inserts into `concepts` (previously empty) and
-- `graph_edges` (previously containing only 2 unrelated `introduces`
-- rows), using slug-based lookups rather than hardcoded UUIDs so it does
-- not depend on transcribing IDs correctly by hand.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place once merged):
--
--   BEGIN;
--   DELETE FROM public.graph_edges WHERE relationship_type IN ('explains', 'supports', 'belongs_to');
--   DELETE FROM public.concepts WHERE slug IN (
--     'information-abundance',
--     'the-proxy-problem',
--     'deep-work'
--   );
--   COMMIT;
--
-- Safe: prior to this migration, `explains`, `supports`, and `belongs_to`
-- all had zero rows in graph_edges (confirmed live before this file was
-- written — the only 2 existing rows are both `introduces`), and
-- `concepts` was empty, so this rollback returns both tables to that
-- exact prior state.

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

-- 7. essay -> explains -> concept (Deep Work)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'essay', e.id, 'concept', c.id, 'explains', null
from essays e, concepts c
where e.slug = 'the-return-of-deep-work'
  and c.slug = 'deep-work';

-- 8. concept -> belongs_to -> topic (Deep Work -> Future of Work)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'concept', c.id, 'topic', t.id, 'belongs_to', null
from concepts c, topics t
where c.slug = 'deep-work'
  and t.slug = 'future-of-work';

-- 9. publication -> explains -> concept (Judgment Economy -> Information Abundance)
insert into graph_edges (source_type, source_id, target_type, target_id, relationship_type, confidence)
select 'publication', pub.id, 'concept', c.id, 'explains', null
from publications pub, concepts c
where pub.slug = 'the-judgment-economy'
  and c.slug = 'information-abundance';

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
