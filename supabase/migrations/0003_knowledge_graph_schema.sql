-- 0003_knowledge_graph_schema.sql
--
-- Introduces the Knowledge Graph schema for Epic 2 (Aristolegion
-- Intelligence Platform), per RFC-003 (Knowledge Graph Architecture, as
-- amended) and TDD-001 §3. This is ES-006: schema only — no content
-- migration (ES-007), no application code, no UI. Every table created here
-- is empty on merge and nothing in the application reads or writes them
-- yet, so this migration is production-safe by construction (Engineering
-- Amendment 1, approved with the Epic 2 Implementation Plan).
--
-- SCOPE NOTE — deviation from TDD-001 §3, flagged per AEP Rule 4:
-- TDD-001 §3 stated "Publication/Essay/Manifesto/Founder already exist and
-- need only additive columns," implying Manifesto and Founder are already
-- database tables. They are not — both are static content today
-- (lib/content/manifesto.ts, the founder bio in lib/content/homepage.ts;
-- confirmed against live production immediately before writing this
-- migration — only the five tables from Epic 1 exist). Creating those
-- tables is a content-migration decision (how many rows, what
-- granularity per Manifesto section) rather than a pure schema one, and
-- promoting them into the Knowledge Graph is ES-007's job, not this
-- migration's. `principles` below therefore has no manifesto_section_id
-- foreign key — the Principle -> Manifesto `belongs_to` relationship will
-- be expressed via graph_edges once ES-007 creates Manifesto rows to
-- reference. This keeps ES-006 scoped to the Database layer's Knowledge
-- Graph scaffolding only, per the one-architectural-layer-per-spec rule
-- now in effect.
--
-- Also correctly out of scope for this migration (per the approved
-- Epic 2 Implementation Plan's own ES-006 boundary, not this file's job):
-- node_embeddings (ES-009, Vector/Embedding layer), distribution_edges
-- (ES-014, Distribution Graph — deliberately a separate concern per
-- RFC-003 Amendment 3), advisor_responses (ES-012, Advisor layer), and the
-- updated_at/archived additive columns on publications/essays/
-- newsletter_issues (real, identified gaps per RFC-002 §5/§8, but not
-- part of this spec's approved scope).
--
-- DESIGN NOTE — graph_edges node references are intentionally polymorphic:
-- source_type/source_id and target_type/target_id identify a row in
-- whichever node table it belongs to (publications, essays, frameworks,
-- concepts, topics, principles, and eventually manifesto/founder), rather
-- than each edge having a dedicated foreign key per possible node table.
-- Foreign keys are enforced only for relationship_type, via a real foreign
-- key against edge_type_definitions below — no edge can exist with an
-- undefined, ungoverned type. Entity existence for source_id/target_id is
-- validated by application services (the Retrieval Service, ES-010), not
-- by the database. Trigger-based polymorphic foreign keys were
-- intentionally avoided to keep this schema extensible: adding a new node
-- type in a future spec never requires a migration to this table, only a
-- new entry in edge_type_definitions' applicable_source_types/
-- applicable_target_types.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   DROP TABLE IF EXISTS public.graph_edges;
--   DROP TABLE IF EXISTS public.edge_type_definitions;
--   DROP TABLE IF EXISTS public.frameworks;
--   DROP TABLE IF EXISTS public.principles;
--   DROP TABLE IF EXISTS public.topics;
--   DROP TABLE IF EXISTS public.concepts;
--   COMMIT;
--
-- Safe: every table here is empty at merge time and nothing in the
-- application depends on them until ES-007 onward, so this rollback loses
-- no data and breaks no running functionality. Both the forward migration
-- and this exact rollback were validated together in a single, uncommitted
-- transaction against production before this file was written — see the
-- ES-006 completion report / PR body for the validation transcript.

BEGIN;

-- -----------------------------------------------------------------------
-- concepts
-- -----------------------------------------------------------------------
-- First-class per RFC-003 Amendment 1 ("retain Concept as a first-class
-- node... do not collapse Concept into Topic... a Topic organizes
-- knowledge, a Concept represents knowledge"). Concepts are what content
-- (Publication/Essay/Framework) explains/references/supports; Topics are
-- how Concepts are organized (see topics below, and the belongs_to edge
-- type seeded into edge_type_definitions connecting Concept -> Topic).

create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table concepts enable row level security;

-- Same posture as every existing table: no anon policies, service role
-- only. Nothing public reads this table directly today — it's consumed
-- server-side by the future Retrieval Service (ES-010).
grant all on public.concepts to service_role;

-- -----------------------------------------------------------------------
-- topics
-- -----------------------------------------------------------------------
-- Replaces the four duplicated static taxonomy lists identified in
-- RFC-002 (lib/content/homepage.ts's `pillars` and `domains`,
-- lib/content/essayCollections.ts, lib/content/founderResearchInterests.ts)
-- with one real, shared, queryable taxonomy. Migrating those four lists'
-- content into rows here is ES-007's job — this creates the empty table
-- only.

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table topics enable row level security;

grant all on public.topics to service_role;

-- -----------------------------------------------------------------------
-- principles
-- -----------------------------------------------------------------------
-- New node type per RFC-003 §3 (beyond what RFC-002 originally proposed)
-- — atomic statements extracted from the Manifesto, individually
-- addressable so a `supports` edge can target a specific Principle rather
-- than "the Manifesto" as one undifferentiated document. See the SCOPE
-- NOTE above: no manifesto_section_id column yet, since no manifesto
-- table exists to reference — that relationship is expressed via
-- graph_edges once ES-007 creates Manifesto rows. `version` supports
-- RFC-002 §8's recommendation that Principles (like Frameworks) get full
-- version history, since institutional statements changing is meaningful
-- enough to track, unlike ordinary content edits.

create table if not exists principles (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table principles enable row level security;

grant all on public.principles to service_role;

-- -----------------------------------------------------------------------
-- frameworks
-- -----------------------------------------------------------------------
-- Promoted to a first-class, DB-backed entity per RFC-002/RFC-003 —
-- resolves the "Capability Dividend™ exists in four disconnected places"
-- fragmentation named repeatedly since RFC-002 §1. `steps` mirrors the
-- shape already used by the existing publications.framework jsonb column
-- (lib/sanctum/types.ts's PublicationFramework: {title, steps}) — a
-- Framework row is what that embedded field should eventually point at
-- via graph_edges (Publication -introduces-> Framework), migrated in
-- ES-007, not created here. `status` reuses the exact two values already
-- established by the static Framework type (lib/content/types.ts's
-- FrameworkStatus: "Published" | "Research Development") rather than the
-- draft/published vocabulary used by publications/essays/newsletter_issues
-- — Frameworks genuinely have a different, existing lifecycle, so this
-- keeps continuity with current code instead of inventing a third
-- vocabulary. `version` supports the same evolves_into lineage RFC-002 §8
-- and RFC-003 §4 both specified.

create table if not exists frameworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  status text not null default 'Research Development'
    check (status in ('Published', 'Research Development')),
  steps jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table frameworks enable row level security;

grant all on public.frameworks to service_role;

-- -----------------------------------------------------------------------
-- edge_type_definitions
-- -----------------------------------------------------------------------
-- Operationalizes RFC-003 Amendment 4's requirement that every
-- relationship type explicitly specify: directional/bidirectional,
-- transitive/non-transitive, unique/repeatable (per source node),
-- confidence-aware/absolute, and time-dependent/permanent — as real,
-- queryable metadata, not just RFC prose. graph_edges.relationship_type
-- references this table, so no edge can ever be created with an
-- undefined, ungoverned type.

create table if not exists edge_type_definitions (
  relationship_type text primary key,
  directional boolean not null default true,
  transitive boolean not null default false,
  unique_per_source boolean not null default false,
  confidence_aware boolean not null default false,
  time_dependent boolean not null default false,
  applicable_source_types text[] not null,
  applicable_target_types text[] not null,
  description text not null
);

alter table edge_type_definitions enable row level security;

grant all on public.edge_type_definitions to service_role;

-- Seed the approved relationship vocabulary (RFC-003 §4, as amended by
-- CTO review — contradicts, inspired_by, and related_to were explicitly
-- deferred/excluded and are deliberately NOT seeded here). `contains` is
-- seeded now, reserved per RFC-003 Amendment 2, even though the `evidence`
-- node type it will eventually point at does not exist yet — this is pure
-- metadata, costs nothing, and documents the reservation directly in the
-- schema rather than only in RFC prose.
insert into edge_type_definitions
  (relationship_type, directional, transitive, unique_per_source, confidence_aware, time_dependent, applicable_source_types, applicable_target_types, description)
values
  ('belongs_to', true, false, false, false, false,
    array['concept'], array['topic'],
    'Categorical: a Concept belongs to a Topic. Many-to-many.'),
  ('authored_by', true, false, true, false, false,
    array['publication', 'essay', 'framework', 'manifesto', 'principle'], array['founder'],
    'Authorship. Single-valued today (one Founder); becomes repeatable only if multi-author support is ever added.'),
  ('introduces', true, false, true, false, false,
    array['publication'], array['framework'],
    'The originating document for a Framework. A Framework should have exactly one introducing Publication.'),
  ('references', true, false, false, false, false,
    array['essay', 'publication'], array['framework', 'publication', 'essay', 'concept'],
    'Cites or mentions, without originating or deeply arguing. Non-transitive: A references B, B references C does not imply A references C.'),
  ('explains', true, false, false, false, false,
    array['essay', 'publication'], array['concept'],
    'The document''s primary subject. Used sparingly by editorial convention — not every tangential mention.'),
  ('supports', true, false, false, true, false,
    array['essay', 'publication'], array['principle', 'framework', 'concept'],
    'Provides argument or evidence for. The one edge type carrying a graded confidence value rather than being treated as a binary fact.'),
  ('operationalizes', true, false, false, false, false,
    array['framework'], array['principle'],
    'Turns an abstract Principle into concrete, actionable steps — a Framework''s own steps are the operationalization.'),
  ('expands', true, false, false, false, false,
    array['essay', 'publication'], array['essay', 'publication'],
    'A deeper or follow-up treatment of an earlier piece''s theme. Non-transitive by design — chains are walked hop-by-hop, never flattened.'),
  ('evolves_into', true, true, true, false, true,
    array['framework'], array['framework'],
    'Framework versioning lineage only. Transitive via explicit multi-hop traversal (v1->v2->v3), not implicit flattening. Time-dependent: carries an inherent temporal ordering.'),
  ('contains', true, false, false, false, false,
    array['publication'], array['evidence'],
    'RESERVED — not yet actionable. Per RFC-003 Amendment 2: Publication -> contains -> Evidence -> supports -> Principle. The evidence node type does not exist yet (deferred to a future spec); this row documents the reservation in schema, not just RFC prose.');

-- -----------------------------------------------------------------------
-- graph_edges
-- -----------------------------------------------------------------------
-- The typed edge table connecting Knowledge Graph nodes. relationship_type
-- must reference a defined type in edge_type_definitions above — see the
-- DESIGN NOTE at the top of this file regarding the polymorphic
-- source_id/target_id references.
--
-- confidence is nullable and meaningful only when
-- edge_type_definitions.confidence_aware is true for that relationship_type
-- (currently only `supports`) — application code should treat a null
-- confidence on a confidence-aware edge as "not yet scored," not as zero.
--
-- No rows are inserted by this migration — graph_edges is empty until
-- ES-007 (content migration) creates real, linked content.

create table if not exists graph_edges (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  relationship_type text not null references edge_type_definitions(relationship_type),
  confidence numeric,
  created_at timestamptz not null default now()
);

alter table graph_edges enable row level security;

grant all on public.graph_edges to service_role;

-- Supports the traversal patterns from RFC-003 §5 / RFC-004 §2 — lookups
-- typically start from either end of an edge (find everything pointing
-- INTO a node, or everything pointing OUT of one), so both directions get
-- an index rather than relying solely on the primary key.
create index if not exists graph_edges_source_idx
  on graph_edges (source_type, source_id);

create index if not exists graph_edges_target_idx
  on graph_edges (target_type, target_id);

COMMIT;
