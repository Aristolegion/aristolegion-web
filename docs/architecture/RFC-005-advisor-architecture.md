# RFC-005: Advisor Architecture

**Status: Original source unavailable.**

This is a documentation stub, not a reconstructed document. RFC-005 is not cited by name anywhere in this repository — its existence is inferred only indirectly, through a reference to a future "Advisor layer" and spec ES-012. No advisor architecture is reconstructed, described, or implied beyond what is stated below. Sections that cannot be recovered are left intentionally blank, with the reason stated.

## Title

RFC-005: Advisor Architecture (title as given in the request that produced this document set; this exact title is not attested anywhere in the repository).

## Purpose

**[UNKNOWN / UNRECOVERABLE, INFERRED ONLY]** Presumed, from its title and the one indirect trace below, to govern an "Advisor" capability referenced elsewhere as future scope. This is speculative framing, not an attested statement of purpose — nothing in the repository describes what an Advisor is, does, or how it would relate to the Knowledge Graph (RFC-003).

## Every repository citation

**RFC-005 itself is never named in this repository, in any file, at any commit** (confirmed via full-repository search and `git log --all`). The only indirectly related trace is in `supabase/migrations/0003_knowledge_graph_schema.sql`, lines 28–32, which lists work explicitly out of scope for that migration:

> "Also correctly out of scope for this migration (per the approved Epic 2 Implementation Plan's own ES-006 boundary, not this file's job): node_embeddings (ES-009, Vector/Embedding layer), distribution_edges (ES-014, Distribution Graph — deliberately a separate concern per RFC-003 Amendment 3), advisor_responses (ES-012, Advisor layer), and the updated_at/archived additive columns on publications/essays/newsletter_issues..."

This establishes only that an "Advisor layer," associated with a future spec ES-012 and a not-yet-created `advisor_responses` table, is planned. It does not name or cite RFC-005.

## What is known

- An "Advisor layer" is referenced as planned, future scope.
- It is associated with spec number **ES-012** (not yet implemented as of ES-009).
- It would involve a table named `advisor_responses` (does not exist in the schema as of ES-009; not created by any migration 0003–0008).
- Nothing else. No design detail, no relationship to the Knowledge Graph's node/edge model, no confidence or scoring behavior, no connection to Publications/Essays/Concepts is stated or implied anywhere in the repository.

## What cannot be recovered

- Whether RFC-005 exists as an approved (or even drafted) document at all — its existence is assumed from the request that produced this document set, not confirmed by repository evidence.
- Any advisor data model, node types, or relationship types it might require.
- Its relationship, if any, to `node_embeddings` (ES-009's Vector/Embedding layer, itself a different ES-009 than the Concepts/Topic Taxonomy spec that shares its number in this repository's migration history — see Note below) or to `distribution_edges` (ES-014).
- Its status (draft/approved/superseded).

**Note on ES-009 numbering:** `0003_knowledge_graph_schema.sql` refers to "ES-009, Vector/Embedding layer" as the spec that would create `node_embeddings`. The Concepts/Topic Taxonomy work actually implemented under the ES-009 label in this repository (`0008_concepts_bootstrap.sql`) is a different piece of work. This numbering discrepancy is noted here because it surfaced during citation-gathering for this document, but resolving it is outside this document's scope.

## Cross-references

- **ES-012** — the only spec number associated with the Advisor layer anywhere in the repository. Not yet scoped or implemented.

## Recommendation

If RFC-005's original source text exists outside this repository, it should be committed in place of this stub rather than have this stub expanded through inference. Do not author advisor architecture under this document's name without that source — doing so would present invented design as CTO-approved architecture, which is the specific failure mode this documentation effort is intended to avoid.
