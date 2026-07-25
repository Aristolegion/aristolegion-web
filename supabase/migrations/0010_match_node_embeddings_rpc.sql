-- 0010_match_node_embeddings_rpc.sql
--
-- ES-010: Embedding Infrastructure — Migration 2 of 2. Adds the
-- match_node_embeddings retrieval RPC and node_embedding_failures, the
-- supporting table the specification's frozen failure-handling policy
-- (5 consecutive failures, ES-010 Final Specification Freeze) requires.
-- No trigger, no additional scope beyond what was frozen.
--
-- RETRIEVAL RPC — per RFC-004 (docs/architecture/RFC-004-retrieval-
-- architecture.md), "Original source unavailable": this function is a
-- new proposal made in the absence of RFC-004 content, not a
-- derivation from it. It performs nearest-neighbor lookup only — no
-- graph traversal, no entity-existence validation for graph_edges (the
-- job RFC-003's DESIGN NOTE assigns to "the Retrieval Service," a
-- distinct, out-of-scope future spec — see the ES-010 specification's
-- repository-consistency note on the ES-010/Retrieval-Service numbering
-- conflict, still unresolved and explicitly non-blocking here). Exposed
-- via PostgREST's /rest/v1/rpc/match_node_embeddings, the same way
-- every other server-side query in this app is made — no new SDK.
--
-- Ordered by cosine distance (<=>), matching the hnsw/vector_cosine_ops
-- index created in migration 0009 and the similarity metric frozen for
-- text-embedding-3-small in the ES-010 Final Specification Freeze.
--
-- EXECUTE is revoked from PUBLIC and granted only to service_role,
-- matching every other table/function's access posture in this schema
-- — nothing public calls this function directly.
--
-- FAILURE TRACKING — node_embedding_failures is a small, non-node
-- companion table (not a Knowledge Graph node: no title/slug/summary,
-- never a graph_edges source or target) implementing the "policy, not
-- code" failure-handling requirement from ES-010 Revision 2 §4: a
-- per-node consecutive-failure count and last-attempt marker, so the
-- reconciliation worker can stop retrying a permanently-failing node
-- after 5 consecutive cycles (the frozen threshold) rather than
-- retrying it forever. A row here does not imply a node_embeddings row
-- exists for the same node — this table specifically tracks nodes that
-- have NOT yet succeeded.
--
-- SCOPE — no trigger, no chunking logic. Nothing in the deployed
-- application calls this RPC or reads node_embedding_failures as of
-- this migration.
--
-- ROLLBACK
-- To fully reverse this migration, run the following as a new,
-- forward-numbered migration (never edit this file in place):
--
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.match_node_embeddings(vector, text, text[], int);
--   DROP TABLE IF EXISTS public.node_embedding_failures;
--   COMMIT;
--
-- Safe: nothing in the deployed application calls this function or
-- reads this table, so this rollback has zero live behavior impact.
-- Independent of migration 0009's rollback — dropping this migration's
-- objects does not require dropping node_embeddings.

BEGIN;

create table if not exists node_embedding_failures (
  node_type text not null,
  node_id uuid not null,
  consecutive_failures integer not null default 0,
  last_attempted_at timestamptz not null default now(),
  last_error text,
  primary key (node_type, node_id)
);

alter table node_embedding_failures enable row level security;

grant all on public.node_embedding_failures to service_role;

create or replace function match_node_embeddings(
  query_embedding vector(1536),
  match_model text,
  node_type_filter text[] default null,
  match_count int default 10
)
returns table (
  node_type text,
  node_id uuid,
  chunk_index int,
  distance float
)
language sql
stable
as $$
  select
    node_embeddings.node_type,
    node_embeddings.node_id,
    node_embeddings.chunk_index,
    node_embeddings.embedding <=> query_embedding as distance
  from node_embeddings
  where node_embeddings.model = match_model
    and (node_type_filter is null or node_embeddings.node_type = any(node_type_filter))
  order by node_embeddings.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function match_node_embeddings(vector, text, text[], int) from public;
grant execute on function match_node_embeddings(vector, text, text[], int) to service_role;

COMMIT;
