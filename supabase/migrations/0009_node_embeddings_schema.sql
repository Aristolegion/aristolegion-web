-- 0009_node_embeddings_schema.sql
--
-- ES-010: Embedding Infrastructure — Migration 1 of 2. Creates the
-- node_embeddings table only: table, constraints, indexes, RLS, grants.
-- No RPC, no reconciliation logic, no data — per the approved ES-010
-- Final Specification Freeze.
--
-- Schema, canonicalization rules, execution architecture (scheduled
-- reconciliation, not trigger/queue), and every decision below were
-- fixed across ES-010's architecture review, Revision 2, and Final
-- Specification Freeze. This migration implements exactly what was
-- frozen — no new design decisions are made here.
--
-- STORAGE — per EDR-001 ("Supabase becomes the canonical knowledge
-- repository"), vectors are stored in this Postgres database via
-- pgvector, not an external vector store.
--
-- NODE REFERENCE — node_type/node_id is polymorphic, mirroring
-- graph_edges' own source_type/source_id design (RFC-003 §3's DESIGN
-- NOTE: "adding a new node type never requires a migration to this
-- table"). No CHECK constraint on node_type's values, for the same
-- reason graph_edges has none — governed by convention, not the
-- database, to preserve that same extensibility. The 7 node types with
-- a table today (essay, publication, framework, principle, concept,
-- topic, manifesto) are exactly the roster ES-006 through ES-009 left
-- in place; no new node type is introduced by this migration.
--
-- UNIQUENESS — (node_type, node_id, chunk_index, model) is unique.
-- graph_edges (ES-006) has no equivalent constraint on its polymorphic
-- columns — a documented, accepted risk from that migration. This
-- table does not repeat that gap: a duplicate embedding for the same
-- node/chunk/model is a schema-level impossibility, not an operational
-- risk to manage.
--
-- CHUNKING — chunk_index defaults to 0. Every node type in scope embeds
-- as a single chunk today; the column exists so a future chunking
-- policy (Manifesto is the node most likely to need one first, given
-- its 8-section, multi-topic content) requires no schema change, only
-- new rows with chunk_index > 0. No chunking logic exists anywhere in
-- this migration or ES-010's scope.
--
-- MODEL VERSIONING — model records the exact embedding model used
-- (text-embedding-3-small, per the ES-010 Final Specification Freeze),
-- so a future model change can coexist with old embeddings during a
-- migration rather than silently corrupting similarity search.
--
-- INDEX — hnsw with vector_cosine_ops, matching the frozen similarity
-- metric (cosine distance). No separate (node_type, node_id) index is
-- added: the unique constraint's own index already covers that
-- leftmost-prefix lookup.
--
-- RLS/GRANTS — identical posture to every existing table in this
-- schema: RLS enabled, zero policies, service_role full grant,
-- anon/authenticated no access. Nothing public reads this table
-- directly — consumed only by the reconciliation worker and, in a
-- future spec, whatever consumes match_node_embeddings (Migration 2).
--
-- SCOPE — no RPC (Migration 2). No trigger (ES-010's execution
-- architecture is a scheduled reconciliation sweep, not a trigger,
-- per the architecture review that rejected the trigger+pgmq design).
-- No existing table is modified.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new,
-- forward-numbered migration (never edit this file in place):
--
--   BEGIN;
--   DROP TABLE IF EXISTS public.node_embeddings;
--   DROP EXTENSION IF EXISTS vector;
--   COMMIT;
--
-- Safe: nothing in the application reads node_embeddings as of this
-- migration (the reconciliation worker and RPC that will populate/read
-- it ship in Migration 2 and application code, both independently
-- rollback-able), and this migration is the sole installer of the
-- vector extension (confirmed not installed immediately prior to
-- writing this migration), so this rollback returns the database to
-- its exact prior state.

BEGIN;

create extension if not exists vector with schema extensions;

create table if not exists node_embeddings (
  id uuid primary key default gen_random_uuid(),
  node_type text not null,
  node_id uuid not null,
  chunk_index integer not null default 0,
  content_hash text not null,
  model text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (node_type, node_id, chunk_index, model)
);

alter table node_embeddings enable row level security;

grant all on public.node_embeddings to service_role;

create index if not exists node_embeddings_hnsw_idx
  on node_embeddings
  using hnsw (embedding vector_cosine_ops);

COMMIT;
