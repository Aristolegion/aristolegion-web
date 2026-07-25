# Architecture Documentation

This directory is the committed source of truth for Aristolegion's architecture decisions. It was created because five governing documents — RFC-002 through RFC-005 and EDR-001 — had been cited as binding authority across `supabase/migrations/` and application code since ES-006, but had never themselves been committed to the repository. That gap is documented in full in the ES-009-era repository inspection and gap analysis that preceded this directory; the summary is below.

None of these documents are original source text. Every one is either a **reconstruction** (assembled from citations, migrations, and implemented work — see each file's Provenance note) or, where the citation evidence was too thin to reconstruct responsibly, a **stub** that records only what's known and states plainly what isn't. If original source text for any of these surfaces outside this repository, it should replace the corresponding file here rather than have the reconstruction or stub expanded further by inference.

| Document | Status | Type |
|---|---|---|
| [EDR-001 — Canonical Knowledge Storage](./EDR-001-canonical-knowledge-storage.md) | Approved | Reconstructed |
| [RFC-003 — Knowledge Graph Architecture](./RFC-003-knowledge-graph-architecture.md) | Approved, as amended | Reconstructed |
| [RFC-002 — Content Architecture Review](./RFC-002-content-architecture-review.md) | Historical Architecture Review | Reconstructed |
| [RFC-004 — Retrieval Architecture](./RFC-004-retrieval-architecture.md) | Original source unavailable | Stub |
| [RFC-005 — Advisor Architecture](./RFC-005-advisor-architecture.md) | Original source unavailable | Stub |

## How to read these documents

Each document tags its own content:

- **[NORMATIVE]** — a binding requirement, currently in force, evidenced by committed schema or code.
- **[HISTORICAL]** — describes a past state, a completed action, or a superseded proposal; not itself a live requirement.
- **[RECONSTRUCTED]** — the specific wording is paraphrased or inferred from citations rather than quoted verbatim; lower confidence than a direct quote, and flagged as such.
- **[UNKNOWN / UNRECOVERABLE]** — content that would belong in the document but cannot be recovered from this repository. Left blank rather than filled in.

## Engineering Specifications implementing this architecture

| Spec | Implements | Migration |
|---|---|---|
| ES-006 | RFC-003 (schema) | `0003_knowledge_graph_schema.sql`, `0004_add_principle_slug.sql` |
| ES-007 | RFC-003 (bootstrap content) | `0005_graph_bootstrap.sql` |
| ES-008A | EDR-001 (essays, "The Glass Partition") | `0006_promote_static_content.sql` |
| ES-008B | EDR-001, RFC-003 (Manifesto node) | `0007_promote_manifesto.sql` |
| ES-009 | RFC-003 (Concepts, Topic edges) | `0008_concepts_bootstrap.sql` |

## Known adjacent gap (not addressed here)

**TDD-001** is cited alongside RFC-003 in `0003_knowledge_graph_schema.sql` ("per RFC-003... and TDD-001 §3") and is equally uncommitted to this repository. It was out of scope for this documentation effort, which was limited to RFC-002 through RFC-005 and EDR-001, but the same gap exists for it and will resurface if it's cited again in future work.
