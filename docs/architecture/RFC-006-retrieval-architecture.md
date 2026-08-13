# RFC-006: Retrieval Architecture

**Status:** Architecture approved by CTO. Finalized for commitment. Not yet committed to the repository. Awaiting explicit CTO authorization to commit. Not implemented. No ES number assigned.

**This is a NEW architecture document, authored now, after ES-010. It is explicitly NOT a reconstruction of RFC-004.** The original RFC-004 was investigated exhaustively — full repository content, complete Git history across all 17 branches and 2 tags (106 commits), and GitHub's issue and PR-comment history — and confirmed unrecoverable. That investigation found exactly one surviving sentence of the original document's content (an edge-index traversal-direction note) and nothing else, anywhere. This document does not claim RFC-004's historical authority, does not present itself as recovered, and was authored entirely from architectural decisions the CTO approved directly, on top of the system ES-006 through ES-010 actually built. Where this document's conclusions happen to match something RFC-004 might once have said, that is coincidence of sound engineering, not inheritance.

**Naming note:** this document is finalized as `RFC-006: Retrieval Architecture`, continuing the `docs/architecture/` RFC series forward from `RFC-005` — the next available number in that specific sequence. It deliberately does not reuse `RFC-004`'s number, and is not a renaming of RFC-004 — RFC-004 remains historically unrecoverable and is not recovered, replaced, or edited by this document. RFC-006 is the new authoritative architecture document for Retrieval, per explicit CTO confirmation.

---

## Historical Note — the ES-010 / "Retrieval Service" reference

`supabase/migrations/0003_knowledge_graph_schema.sql` (ES-006, authored before this document existed) contains two citations: *"validated by application services (the Retrieval Service, ES-010)"* and *"the future Retrieval Service (ES-010)."* `docs/architecture/RFC-003-knowledge-graph-architecture.md` and the original `RFC-004-retrieval-architecture.md` stub both repeat this citation. At the time those lines were written, the Epic 2 Implementation Plan evidently intended **ES-010** to be the Retrieval Service, and **ES-009** to be the embedding/vector layer (per `0003`'s separate citation: *"node_embeddings (ES-009, Vector/Embedding layer)"*).

Neither happened as planned. **ES-009** was delivered as Concepts/Topic Taxonomy (unrelated work). **ES-010** was delivered as Embedding Infrastructure — the work originally slated for ES-009. Per explicit CTO direction: **ES-010 is not being renamed. It remains Embedding Infrastructure, permanently.** The Retrieval Service described in those old citations does not have a number yet. Per CTO direction, it will receive the next genuinely available Engineering Specification number **only after this architecture document is formally approved** — not before, and not automatically.

Every occurrence of "the Retrieval Service, ES-010" in `0003`, `RFC-003`, and the old `RFC-004` stub is now understood to be a stale reference to a numbering plan that was never executed. None of those files have been edited as part of this exercise — this note exists here, in the new document, as the explanation, not as a correction applied to the old citations in place.

---

## A. Purpose and Scope

Retrieval Architecture v1 defines how a query (currently: any server-side caller with a text string) is turned into a ranked, structured, attributed set of Knowledge Graph nodes. It is an internal server-side capability with no public interface in v1. It sits directly on top of ES-010's completed embedding infrastructure and the existing Knowledge Graph (ES-006–ES-009), and adds nothing to either — it is a new, additive layer, not a modification of what already exists.

## B. Architectural Position in the Aristolegion Intellectual Infrastructure

```
Knowledge Graph (ES-006–ES-009)         Embedding Infrastructure (ES-010)
  7 node types, graph_edges,              node_embeddings, match_node_embeddings,
  edge_type_definitions                   canonicalization, reconciliation
              \                                    /
               \                                  /
                v                                v
                    Retrieval Architecture (this document)
                    query -> candidates -> single-hop expansion -> structured results
                                    |
                                    v
                    Future Advisor layer (RFC-005 / ES-012 — not specified,
                    not designed here, consumes Retrieval's output only)
```

Retrieval depends on the Knowledge Graph and Embedding Infrastructure. Nothing depends on Retrieval yet. The Advisor layer is a future, independent consumer — Retrieval is designed to be usable by it without knowing anything about it (see §S).

## C. Query Lifecycle

1. A server-side caller supplies query text.
2. Retrieval generates a query embedding (§D).
3. Retrieval calls `match_node_embeddings` for vector candidates (§E).
4. Retrieval performs bounded single-hop graph expansion on those candidates (§F).
5. Retrieval composes vector results and graph context into one structured result set (§G), ranked per §H.
6. Retrieval returns the structured result (§J) to the caller. Retrieval's responsibility ends here — no LLM call, no prompt, no response generation (§R).

## D. Query Embedding

Query-time embeddings reuse ES-010's existing provider exactly: `text-embedding-3-small`, 1536 dimensions, via `lib/embeddings/provider.ts`'s existing `generateEmbedding` / `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` constants — read from that single source of truth, not a separately configured value (this is the mechanism behind §Q's compatibility guarantee). No new provider, no new model, no new dimension is introduced. This is a direct application of the CTO-approved direction (point 3).

## E. Vector Candidate Retrieval

Unchanged from ES-010: `match_node_embeddings(query_embedding, match_model, node_type_filter, match_count)` remains the sole vector candidate primitive (CTO-approved point 4). Retrieval calls it with `match_model = 'text-embedding-3-small'` (matching every stored row) and a bounded `match_count`. No new RPC, no modification to the existing one.

## F. Single-Hop Graph Expansion

For each vector candidate returned by §E, Retrieval looks up every `graph_edges` row where that candidate is either `source` or `target` (both directions), and resolves the identity (`node_type`, `node_id`) of the node on the other end. This is exactly one hop — the connected node is *not* itself expanded further. Traversal is relationship-type-agnostic: it follows whatever edges exist on the candidate, regardless of `relationship_type`, and reports the relationship type as part of the result (§J) so the consumer can interpret or filter it. This is a direct application of CTO-approved points 6 and 7.

**Why multi-hop is intentionally deferred, not just unbuilt:**
- **Sparse graph, no data to validate depth.** 30 nodes, 13 edges today. Multi-hop traversal on a graph this sparse has a high ratio of noise to signal with no production evidence either way — there's nothing to tune against.
- **Unbounded cost/latency risk with no existing safeguard.** Nothing in this codebase has ever needed to bound a recursive graph query; building that machinery for a capability with zero current traffic is premature.
- **No composition strategy exists yet.** Combining results from multiple hops meaningfully (weighting a 2-hop match against a 1-hop match) is exactly the kind of ranking-formula decision explicitly out of scope for v1 (§H) — multi-hop can't be responsibly added until that's solved, and solving it now would mean inventing a formula the CTO hasn't approved.
- Single-hop is trivially bounded (candidates × their immediate edge count), fully auditable, and sufficient to deliver on the CTO-approved intent — graph relationships as contextual and attribution signals, explicitly not ranking signals (point 9) — without any of the above risk.

## G. Hybrid Result Composition

Vector candidates (§E) are the base result set. Each candidate is enriched — not replaced, not re-ordered by a separate score — with its single-hop graph context (§F). Composition is additive: graph expansion adds graph-relationship context (distinct from source attribution — see §K) to an already-ranked vector result list; it does not introduce a second, competing set of candidates to merge or deduplicate against, and does not alter the rank established in §H. This directly implements CTO-approved point 5 (vector-first) and point 6 (graph expansion happens *after* candidates are identified, not before or in parallel).

## H. Ranking Model for v1

Defined conceptually, per explicit CTO instruction not to invent numerical weights:

1. **Primary signal: semantic similarity.** Candidates are ordered by `match_node_embeddings`' own cosine-distance ordering (ascending distance = descending relevance). This is the sole ranking signal in v1 (CTO-approved point 8).
2. **Graph relationships are contextual and attribution signals, not ranking signals in v1.** Single-hop relationship context (§F) is attached to each candidate as metadata a consumer can use to understand how it connects to other results — it does not move a candidate's rank position, is not consulted when ordering candidates, and no blended/weighted score combining vector distance with graph structure is computed anywhere in v1 (CTO-approved point 9).
3. **Confidence: not used.** `graph_edges.confidence` plays no role in v1 ranking. Reason, stated plainly: production data contains **zero** scored `supports` edges (verified: 0 of 4 `supports` edges have a non-null `confidence` value) — there is no data to rank by, so no formula is invented to rank by it (CTO-approved point 10).
4. **Deterministic tie-breaking.** When two or more candidates have identical cosine distance (a real, if rare, case — e.g., duplicate or near-duplicate content), results are ordered by `node_id` ascending. This introduces no business judgment — it exists solely so that repeated identical queries return results in a stable, reproducible order, nothing more.

## I. Treatment of Relationship Confidence

Confirmed, not merely asserted: live production query shows all 4 `supports` edges (the only `confidence_aware` relationship type) carry `confidence = NULL`. Per `edge_type_definitions`, `NULL` means "not yet scored," not zero. Retrieval v1 treats confidence as **entirely absent from the system**, not as a signal defaulting to some baseline value — no `NULL`-to-number coercion, no implicit weighting. If confidence scoring is ever implemented (a separate, unscoped future effort), Retrieval's ranking model would need deliberate revision at that time — this document does not pre-design that.

## J. Structured Retrieval Result Contract

Model-agnostic, structured data — never a prompt, never model-generated text (CTO-approved point 11). Each candidate carries two distinct kinds of information, which this contract keeps structurally separate and which must not be conflated:

- **Source attribution** (the `source` block) — identifies the actual evidence source: `node_type`, `node_id`, and implementation-defined identity/display fields. This is provenance: *what this result is and where it came from.*
- **Graph relationship context** (the `relationship_context` block) — describes how that source connects to other Knowledge Graph nodes: `relationship_type`, `direction`, `related_node_type`, `related_node_id`. This is structural context: *how this result relates to other things in the graph.* It is not attribution, and it is not a ranking signal (§H).

Proposed shape (this is architecture-document-level structure, not implementation code):

```
RetrievalResult {
  query: {
    text: string                    // the original query text
    embedding_model: string         // e.g. "text-embedding-3-small"
    embedding_dimensions: number    // e.g. 1536
  }
  candidates: [
    {
      rank: number
      node_type: string             // e.g. "essay", "concept"
      node_id: string                // uuid
      similarity: {
        distance: number             // raw cosine distance from match_node_embeddings
      }
      source: {
        // SOURCE ATTRIBUTION — provenance. Minimal identity fields
        // sufficient for a consumer to look up or display the node — NOT
        // the full canonical embedded text. Exact field set per node_type
        // is an implementation-spec-time decision (see "Remaining
        // Ambiguity" in the transmittal below).
      }
      relationship_context: [
        {
          // GRAPH RELATIONSHIP CONTEXT — structural connection, not
          // attribution and not a ranking input (§H).
          relationship_type: string   // e.g. "explains", "belongs_to"
          direction: "outgoing" | "incoming"   // relative to this candidate
          related_node_type: string
          related_node_id: string
        }
        // one entry per single-hop edge touching this candidate; empty
        // array if the candidate has no graph_edges connections
      ]
    }
  ]
  metadata: {
    total_candidates: number
    model_used: string
    generated_at: string   // ISO 8601 timestamp
  }
}
```

This satisfies CTO-approved points 11, 12, and 18: structured, preserves source identity via source attribution, carries graph relationship context separately where applicable, and contains enough for a future Advisor to build its own context — while Retrieval itself never constructs a prompt or calls a generation model.

## K. Source Attribution

Source attribution and graph relationship context are distinct and must not be conflated:

- **Attribution identifies provenance.** Every candidate's `source` block (§J) — `node_type`, `node_id`, and implementation-defined identity/display fields — traces directly back to its row in the Knowledge Graph, the same identity `node_embeddings` already carries. This is the attribution mechanism: it establishes *what this result is and where it came from.*
- **`relationship_context` (§J) is graph context, not attribution.** It describes how a source connects to other Knowledge Graph nodes (`relationship_type`, `direction`, `related_node_type`, `related_node_id`). It answers *how this result relates to other things in the graph* — a different question from provenance, and it is not treated as a ranking signal either (§H).

No new attribution mechanism is introduced beyond exposing what the Knowledge Graph and embedding layer already track; the `source` block is that mechanism, and only that block.

## L. Authentication and Exposure Model

Retrieval is an internal, server-side-only capability in v1 (CTO-approved points 1, 2, 15). No public API, no new external endpoint. Consistent with every existing table and function in this system — `service_role`-only access, callable only from other server-side code (Route Handlers, Server Components), never from a client. This is not a new posture; it's the same posture every table in this schema has had since ES-006, applied to a new capability rather than relaxed for it.

## M. Failure Handling

Retrieval has two structurally different failure classes, and v1 does not conflate them:
- **No matching candidates** is a valid, successful empty result — not a failure.
- **A query-time embedding generation failure** (the OpenAI call in §D failing) *is* a failure the caller must be able to distinguish from an empty result.

Beyond that distinction, this document does not specify exact retry counts, backoff timing, or a "permanent failure" threshold the way ES-010's Revision 2 froze specific numbers (3 retries, exponential backoff, 5-consecutive-failure threshold) — those were CTO-approved for the *reconciliation* worker's batch context specifically. Retrieval's failure handling is synchronous and user/caller-facing, a different context with different stakes, and CTO has not yet approved specific numeric retry/backoff policy for it. This is flagged explicitly in the transmittal below as remaining ambiguity, not silently resolved by reusing ES-010's numbers.

## N. Cost Controls

v1's primary cost control **is** §L's exposure model: because nothing but internal server-side code can call Retrieval, and no internal caller exists yet, there is no traffic to control. Per CTO-approved point 15, no unrestricted public endpoint is introduced. No separate rate-limiting or quota mechanism is specified in v1 — there is nothing yet to rate-limit. This is deferred, not solved, pending an actual internal caller existing (see §V).

## O. Observability

Minimal and structured, without logging sensitive query content (CTO-approved point 16): log structural metadata only — timestamp, candidate count returned, latency, success/failure classification (§M). Raw query text and the generated query embedding vector are **not** logged by default, since query text may contain sensitive user-authored content and the embedding vector itself is a lossy but real encoding of it. Exact logging destination/format is an implementation-spec-time decision, not fixed here.

## P. Freshness Assumptions Inherited from ES-010

Retrieval performs no freshness check of its own. It queries whatever `node_embeddings` currently contains and inherits ES-010's existing staleness bound entirely — bounded by however recently reconciliation last ran (manual invocation today; hourly once a future, separate change reintroduces the Cron schedule, per the still-pending Phase 6 from ES-010's own rollout). Retrieval does not compare `content_hash` at query time; doing so would duplicate work reconciliation already does and adds latency for no benefit Retrieval itself needs.

## Q. Embedding Model/Version Compatibility

Query-time embeddings must be generated with the exact same `model` identifier and dimension that `node_embeddings.model` stores for the rows being searched — enforced structurally by reading from `lib/embeddings/provider.ts`'s constants (§D) rather than a separately configurable value, so the two can never drift independently by accident. If the embedding model ever changes, that is a migration event in ES-010's own lineage (the `model` column already exists specifically to allow old and new embeddings to coexist during such a transition) — not a problem Retrieval solves itself.

## R. Explicit Non-Goals (v1)

- No public-facing Retrieval API.
- No multi-hop or recursive graph traversal.
- No confidence-based ranking (no data exists to rank by).
- No numeric relevance-blending formula combining vector distance with graph structure.
- No LLM prompt construction, no response generation, no model call beyond the query embedding itself.
- No Advisor implementation, and no RFC-005 architecture invented here.
- No pagination (CTO-approved point 13).
- No caching (CTO-approved point 14).
- No ES-011 or implementation specification — this document is architecture only.
- No renaming of ES-010, no editing of the stale citations in `0003`/`RFC-003`/old `RFC-004` (explained, not corrected, per the Historical Note above).

## S. Future Compatibility with the Advisor Layer

Per CTO-approved points 17 and 18: Retrieval is designed to be independent of Advisor's eventual implementation. The structured result contract (§J) is the entire interface — a future Advisor consumes `RetrievalResult` and owns all prompt construction, context window management, and LLM invocation itself. Retrieval does not need to know Advisor exists to be complete; Advisor will need Retrieval, not the reverse. No RFC-005 architecture is inferred, assumed, or designed around here (CTO-approved point 19) — §J's shape was derived from what Retrieval itself has to offer (structured results carrying both source attribution and, separately, graph relationship context — see §K), not from any assumption about what Advisor specifically needs.

## T. Security Considerations

- Consistent `service_role`-only posture (§L) — no new attack surface introduced relative to what already exists.
- No client-side exposure of any kind.
- Query content is not logged by default (§O), limiting exposure if logs are ever compromised.
- Direct, evidenced lesson from this engagement: the ES-010 `CRON_SECRET` was exposed twice during this same session's operational validation (once pasted in chat, once passed through a blocked `curl` attempt) and had to be rotated. Any future Retrieval-adjacent secret (should an authenticated internal endpoint ever be added, §V) should be handled with that concrete precedent in mind — this is not a hypothetical risk in this codebase, it already happened once.

## U. Performance Considerations

At current production scale (30 nodes, 13 edges), neither vector search nor single-hop expansion is a meaningful cost — both are trivial Postgres operations against tables this small. The actual latency and cost driver is the query-time OpenAI embedding call itself (§D), a network round-trip to a third-party API, not anything on the Postgres side. This is why no caching is specified for v1 (§N, CTO-approved point 14) — there's no current query volume to justify it, and the bottleneck isn't the part caching would help with anyway (repeated identical queries would benefit from caching the embedding call, not the graph query).

## V. Open Questions Deliberately Deferred

- Exact `source` field set per `node_type` in the result contract (§J) — needs implementation-spec-level detail once a concrete caller exists to specify what it actually needs displayed.
- Exact retry/backoff/failure-classification numbers for query-time embedding failures (§M) — ES-010's batch-context numbers are not assumed to transfer.
- Whether/how an internal caller authenticates to Retrieval, once one actually exists (today: none does, so nothing to design yet).
- Rate limiting / quota mechanism (§N) — deferred until real internal traffic exists to size it against.
- Logging destination/format specifics (§O).
- Whether confidence-based ranking is ever built, and if so, what populates `graph_edges.confidence` first — a separate, unscoped effort this document does not start.
- Multi-hop traversal, if ever justified by future data/usage patterns (§F) — explicitly not designed here.

---

# Transmittal to CTO

## 3. Where each approved decision landed

| # | Approved decision | Section(s) |
|---|---|---|
| 1 | Internal server-side capability | §L |
| 2 | No public API in v1 | §L, §R |
| 3 | Reuse ES-010 OpenAI provider, 1536-dim | §D, §Q |
| 4 | `match_node_embeddings` remains the vector primitive | §E |
| 5 | Vector-first | §G |
| 6 | Bounded graph expansion after vector candidates | §F, §G |
| 7 | Single-hop only, no arbitrary multi-hop | §F |
| 8 | Vector similarity is primary relevance signal | §H.1 |
| 9 | Graph relationships as contextual/attribution signal, explicitly not a ranking signal | §H.2, §K |
| 10 | Confidence not used for ranking (0 scored edges) | §H.3, §I |
| 11 | Structured results, not a prompt, not generated context | §J, §R |
| 12 | Preserve source identity (attribution) and relationship path (graph context) as distinct fields | §J, §K |
| 13 | No pagination in v1 | §R |
| 14 | No caching in v1 | §N, §U |
| 15 | Server-controlled query-time cost, no unrestricted public endpoint | §L, §N |
| 16 | Minimal, structured observability, no sensitive query logging | §O |
| 17 | Independence from future Advisor implementation | §S |
| 18 | Advisor consumes structured results, owns prompt/context construction | §J, §S |
| 19 | Do not invent RFC-005 architecture | §S (explicit statement) |
| 20 | ES-010 not renamed, remains Embedding Infrastructure | Historical Note |
| 21 | Retrieval Service gets next ES number only after architecture approval | Historical Note |

## 4. Remaining ambiguity that would block writing an implementation spec today

These are gaps an implementation spec cannot proceed without resolving — distinct from §V's "deliberately deferred" items, which are deferred *by design*, not blocking:

1. **`source` field contents (§J) are placeholder-shaped, not concretely specified.** I've defined the envelope (`node_type`, `node_id`, `similarity`, `relationship_context`) but deliberately left the exact per-node-type display/identity fields unspecified, since no real caller exists yet to derive requirements from. An implementation spec would need this pinned down before writing code.
2. **§M's failure handling is a classification scheme, not a policy.** No retry count, backoff timing, or timeout is approved for query-time embedding calls. This must be explicitly decided (not silently reused from ES-010) before implementation.
3. **No caller exists yet, so §L's "internal server-side capability" has no concrete shape.** Is it a plain TypeScript module other server code imports directly (no HTTP hop at all), or an internal Route Handler? This document says "internal," which rules out public exposure, but doesn't yet resolve that specific structural question — and it materially affects how an implementation spec would be written.
4. **§H's tie-breaking and §F's traversal are defined conceptually but not with exact query shapes.** Translating "single-hop, both directions, all relationship types" into exact SQL/RPC design (a new function? reuse of existing helpers? a new `match_node_embeddings`-adjacent query?) is implementation-spec work, not resolved here by design — but worth flagging so it isn't assumed to be trivial.

None of these block CTO approval of the *architecture* — they're exactly the kind of detail an implementation Engineering Specification exists to resolve. Flagging them now so approval isn't mistaken for "ready to build."

---

Stopping here. Architecture approved with the three editorial corrections applied; document held locally only at `/tmp/claude-0/-home-user-aristolegion-web/acf849e5-330c-5493-9321-fe738bc74b5a/scratchpad/RFC-006-retrieval-architecture-draft.md`. Not committed, no branch, no PR. Awaiting explicit CTO approval to commit.
