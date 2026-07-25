# RFC-004: Retrieval Architecture

**Status: Original source unavailable.**

This is a documentation stub, not a reconstructed document. No file matching RFC-004 was ever committed to this repository, and unlike EDR-001, RFC-002, and RFC-003, the citation evidence for RFC-004 is too thin to responsibly reconstruct its architecture. Reconstructing a retrieval design from one sentence would mean inventing content and presenting it as approved — this document does not do that. Sections that cannot be recovered are left intentionally blank, with the reason stated.

## Title

RFC-004: Retrieval Architecture (title as cited; no alternate or fuller title is attested anywhere in the repository).

## Purpose

**[UNKNOWN / UNRECOVERABLE, INFERRED ONLY]** Based on its title and its one citation, RFC-004 appears to govern how the Knowledge Graph (RFC-003) is queried or traversed at the application layer. This is an inference from context, not an attested statement of purpose — no citation in the repository describes RFC-004's purpose directly.

## Every repository citation

There is exactly one citation of RFC-004 anywhere in this repository, at `supabase/migrations/0003_knowledge_graph_schema.sql`, line 284:

> "Supports the traversal patterns from RFC-003 §5 / RFC-004 §2 — lookups typically start from either end of an edge (find everything pointing INTO a node, or everything pointing OUT of one), so both directions get an index rather than relying solely on the primary key."

No other file in the repository (tracked, `git log --all`, or working tree) mentions RFC-004.

## What is known

- RFC-004 has at least a §2.
- RFC-004 §2 discusses traversal or lookup patterns over the Knowledge Graph — specifically, that lookups over an edge commonly originate from either its source or its target ("either end of an edge").
- This specific claim directly motivated a concrete, verifiable implementation decision: `graph_edges` is indexed on both `(source_type, source_id)` and `(target_type, target_id)` (`graph_edges_source_idx`, `graph_edges_target_idx`), rather than relying solely on the primary key.
- `0003_knowledge_graph_schema.sql`'s DESIGN NOTE states that entity existence for `graph_edges.source_id`/`target_id` is validated by "application services (the Retrieval Service, ES-010)" — the only trace connecting RFC-004 to a specific, still-unimplemented future spec (ES-010).

## What cannot be recovered

- RFC-004's full section structure and everything beyond §2.
- Any retrieval API shape, query language, or endpoint design.
- Caching strategy, if any.
- Pagination, ranking, or relevance-scoring behavior.
- How (or whether) `graph_edges.confidence` is meant to be used during retrieval.
- Whether RFC-004 was ever formally approved, or is still in draft — its status is unattested; "Approved" is not asserted here because no citation confirms it, unlike EDR-001/RFC-002/RFC-003 where approval is directly evidenced by implemented, merged migrations executing the decision.

## Cross-references

- **RFC-003** §5 (see `RFC-003-knowledge-graph-architecture.md` §6) — the paired citation; RFC-003 and RFC-004 are cited together for the same indexing decision.
- **ES-010** — the only spec named as a likely implementer of whatever RFC-004 specifies (via the Retrieval Service reference in `0003_knowledge_graph_schema.sql`). As of this document, ES-010 has not yet been scoped or implemented.

## Recommendation

If RFC-004's original source text exists outside this repository, it should be committed in place of this stub rather than have this stub expanded through inference. This stub should remain in place, unmodified in its "original source unavailable" status, until that original text is located.
