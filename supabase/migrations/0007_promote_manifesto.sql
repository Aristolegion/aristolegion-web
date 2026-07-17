-- 0007_promote_manifesto.sql
--
-- ES-008B: Manifesto Representation. Promotes the Manifesto from a static
-- TypeScript document (lib/content/manifesto.ts's `manifestoSections`)
-- into the canonical database-backed knowledge model, per EDR-001
-- ("Supabase becomes the canonical knowledge repository... Static
-- TypeScript files are a transitional compatibility layer and will be
-- retired after migration and cutover") and RFC-003 (Manifesto is one of
-- the 8 first-class Knowledge Graph node types).
--
-- Content is copied verbatim from lib/content/manifesto.ts. No section is
-- rewritten, paraphrased, or invented by this migration.
--
-- SCOPE NOTE — this migration is intentionally independent of migrations
-- 0003-0006: it creates its own standalone `manifesto` table and inserts
-- zero graph_edges rows (see the GRAPH INTEGRATION note below), so unlike
-- any bootstrap data that would reference `principles`/`graph_edges`, this
-- migration has no ordering dependency on 0003-0006 being applied first.
--
-- SINGLETON DESIGN — per ES-008B Task 1, this table holds exactly one row,
-- enforced at the schema level (not just by application convention): `id`
-- is constrained via CHECK to one fixed, permanent UUID
-- (a6707782-1b6b-401e-a510-efb1cce8f82d, generated once during migration
-- authoring), so no second row with a different id can ever be inserted,
-- and the primary key prevents a second row with the same id. This UUID
-- is the Manifesto's stable identity going forward — no prior Manifesto
-- id existed anywhere in the schema to preserve (0003/0005 explicitly
-- deferred creating a Manifesto table or row), so this migration
-- establishes it once, permanently. No version history, no
-- multi-manifesto support, per Task 1's explicit constraints.
--
-- GRAPH INTEGRATION (Task 4) — this table's single row IS the canonical
-- Manifesto node RFC-003 requires (the same pattern `concepts`/`topics`/
-- `principles`/`frameworks` already establish: each first-class node type
-- is its own table, referenced polymorphically by graph_edges via
-- source_type/target_type). No graph_edges rows are inserted by this
-- migration. Checked against edge_type_definitions (seeded in 0003):
-- 'manifesto' appears as an applicable_source_type on exactly one
-- relationship type, `authored_by` — whose only applicable_target_type is
-- `founder`, a node type explicitly out of ES-008B's scope (no `founder`
-- table exists). No relationship type has 'manifesto' as an applicable
-- target_type at all, so a Principle -> Manifesto edge (e.g. for the 5
-- Principle sections already promoted in 0005) is equally unsupported
-- under the currently-approved vocabulary. Per Task 4's explicit
-- constraints ("do not infer relationships... do not create speculative
-- edges... do not introduce unsupported relationship types"), the correct
-- outcome is zero edges, not a workaround — extending
-- edge_type_definitions' applicable_source_types/applicable_target_types
-- to cover this is a schema decision for a future spec, not this one.
--
-- TASK 3 NOTE — "Origin", "Core Values", and "A Call to Reflection" (the
-- three sections ES-007 excluded from becoming Principles) get no
-- separate table or rows here: their sole database representation is
-- being part of this row's `sections` array, alongside the other 5
-- sections that are *also* independently represented as `principles`
-- rows. This migration does not insert, modify, or reference any
-- `principles` row.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new, forward-
-- numbered migration (never edit this file in place):
--
--   BEGIN;
--   DROP TABLE IF EXISTS public.manifesto;
--   COMMIT;
--
-- Safe: this migration creates `manifesto` and inserts exactly the one
-- row it creates — nothing else is modified, no other table is read or
-- written, so dropping it loses only what this migration itself added.
-- This migration and the above rollback were validated together in a
-- single, uncommitted transaction against production before this file was
-- written — see the ES-008B completion report / PR body for the
-- validation transcript.

BEGIN;

create table if not exists manifesto (
  id uuid primary key default 'a6707782-1b6b-401e-a510-efb1cce8f82d'::uuid
    check (id = 'a6707782-1b6b-401e-a510-efb1cce8f82d'::uuid),
  slug text not null unique,
  title text not null,
  sections jsonb not null,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table manifesto enable row level security;

-- Same posture as every existing table: no anon policies, service role
-- only. The public /manifesto page reads through the service role key
-- (app/manifesto/page.tsx), same as every other public content route.
grant all on public.manifesto to service_role;

-- Title copied verbatim from the existing, already-live metadata in
-- app/manifesto/page.tsx (`openGraph.title`), not authored fresh.
-- `sections` is copied verbatim, in order, from lib/content/manifesto.ts's
-- `manifestoSections` — all 8 sections, including the 5 (Mission, Vision,
-- Philosophy of Judgment, Philosophy of Capability, Human Excellence)
-- already independently represented as `principles` rows (0005) — this
-- table represents the complete document, not a diff against Principles.
insert into manifesto (id, slug, title, sections, status) values (
  'a6707782-1b6b-401e-a510-efb1cce8f82d',
  'manifesto',
  'The Aristolegion Manifesto',
  '[
    {
      "heading": "Origin",
      "paragraphs": [
        "Aristolegion did not begin as a company in search of a market. It began as a response to a problem: modern professionals face information abundance but wisdom scarcity, credential inflation but declining signal quality, and a pace of technological change that outstrips most institutions'' capacity to help anyone develop real judgment.",
        "Aristolegion was built to be something else entirely — an independent intellectual institution, built slowly and deliberately, in service of a longer purpose than growth for its own sake."
      ]
    },
    {
      "heading": "Mission",
      "paragraphs": [
        "To help ambitious individuals develop judgment, capability, leadership, and character through research, publications, essays, frameworks, and carefully designed communities."
      ]
    },
    {
      "heading": "Vision",
      "paragraphs": [
        "To become one of the world''s most respected independent intellectual institutions for judgment, capability, leadership, resilience, and human excellence — measured not by attention captured, but by capability compounded."
      ]
    },
    {
      "heading": "Core Values",
      "list": [
        "Elegance",
        "Strength",
        "Capability",
        "Integrity",
        "Judgment",
        "Lifelong Learning",
        "Intellectual Curiosity",
        "Professional Excellence",
        "Institutional Authority",
        "Editorial Quality"
      ]
    },
    {
      "heading": "Philosophy of Judgment",
      "paragraphs": [
        "Judgment compounds the way capital compounds — quietly, and only for those who invest in it deliberately. Aristolegion treats judgment not as an innate trait some people happen to have, but as a discipline that can be studied, practiced, and refined over the course of a working life.",
        "Where most institutions optimize for information transfer, Aristolegion optimizes for judgment transfer: the capacity to weigh evidence, resist noise, and act well under uncertainty."
      ]
    },
    {
      "heading": "Philosophy of Capability",
      "paragraphs": [
        "Capability, not credentials, is the last durable competitive advantage available to any individual or institution. Degrees and certifications are proxies; they were never the substance. Aristolegion exists to help close the distance between the two — restoring a reliable signal between what people can actually do and how that capability is recognized."
      ]
    },
    {
      "heading": "Human Excellence",
      "paragraphs": [
        "Human excellence is not a single achievement but a compounding practice — the sum of small, deliberate choices toward greater judgment, greater capability, greater leadership, and greater character, sustained over years rather than days.",
        "Aristolegion measures its own success the same way: not by how much time a reader spends with its work, but by whether that reader leaves with better judgment than they arrived with."
      ]
    },
    {
      "heading": "A Call to Reflection",
      "paragraphs": [
        "Aristolegion asks one thing of every reader before anything else: reflection before reaction, evidence before opinion, and patience before certainty."
      ],
      "quote": "If this manifesto has done its work, it has raised better questions than it answered."
    }
  ]'::jsonb,
  'published'
);

COMMIT;
