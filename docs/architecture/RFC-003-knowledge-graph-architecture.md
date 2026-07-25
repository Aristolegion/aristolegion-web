# RFC-003: Knowledge Graph Architecture

**Status:** Approved, as amended (Amendments 1–4)

**Provenance:** Reconstructed. No file matching this document was ever committed to this repository. This document was assembled from citations of RFC-003 in `supabase/migrations/0003_knowledge_graph_schema.sql`, `0005_graph_bootstrap.sql`, `0007_promote_manifesto.sql`, `0008_concepts_bootstrap.sql`, and `app/library/page.tsx`. Where the schema itself encodes an RFC-003 requirement (e.g. the seeded `edge_type_definitions` rows), that schema is reproduced verbatim below and is the strongest possible evidence available — it is not prose paraphrase, it is the enforced structure.

Tag legend: **[NORMATIVE]** binding, currently in force, schema/code-evidenced · **[HISTORICAL]** past state, not a live requirement · **[RECONSTRUCTED]** paraphrased/inferred from citations, lower confidence than a direct quote · **[UNKNOWN / UNRECOVERABLE]** belongs here but not recoverable.

---

## 1. Predecessor

**[HISTORICAL]** RFC-003 extended a node-type set that RFC-002 (Content Architecture Review) originally proposed — see `RFC-002-content-architecture-review.md` §2. RFC-003 §3 explicitly adds Principles "beyond what RFC-002 originally proposed" (`0003_knowledge_graph_schema.sql`).

**[UNKNOWN / UNRECOVERABLE]** The pre-amendment text of RFC-003 — what §1, §2 originally specified before the amendments below were incorporated — is not recoverable. Only the current, amended state is reconstructable.

## 2. Node model

**[NORMATIVE — Amendment 1, direct quote]**

> "retain Concept as a first-class node... do not collapse Concept into Topic... a Topic organizes knowledge, a Concept represents knowledge."

Concepts are what content (Publication/Essay/Framework) `explains`/`references`/`supports`; Topics are how Concepts are categorically organized, via the `belongs_to` edge type (Concept → Topic, many-to-many).

**[NORMATIVE — RECONSTRUCTED for the full roster count]** RFC-003 establishes 8 first-class Knowledge Graph node types (per `0007_promote_manifesto.sql`: "Manifesto is one of the 8 first-class Knowledge Graph node types"). 7 are directly evidenced by a dedicated table in the schema:

| Node type | Table | Established by |
|---|---|---|
| Publication | `publications` | Epic 1 (pre-dates RFC-003) |
| Essay | `essays` | Epic 1 (pre-dates RFC-003) |
| Framework | `frameworks` | ES-006 |
| Principle | `principles` | ES-006 |
| Concept | `concepts` | ES-006 |
| Topic | `topics` | ES-006 |
| Manifesto | `manifesto` | ES-008B |

**[RECONSTRUCTED — inference, flagged as lower-confidence]** The 8th node type is not directly named as such anywhere in the repository. It is inferred to be **Founder**: `authored_by`'s `applicable_target_types` in the `edge_type_definitions` seed data is `[founder]` — a schema-committed reference to a node type with no table yet created. This is the only unaccounted-for node type referenced anywhere in the schema, which is why it is inferred to be the 8th, but no citation states this explicitly. A `founder` table does not exist as of ES-009.

## 3. Edge model

**[NORMATIVE — direct quote/paraphrase from the `graph_edges` DESIGN NOTE, `0003_knowledge_graph_schema.sql`]** `graph_edges` node references are intentionally polymorphic: `source_type`/`source_id` and `target_type`/`target_id` identify a row in whichever node table it belongs to, rather than each edge having a dedicated foreign key per possible node table. The only foreign-key-enforced column is `relationship_type`, which references `edge_type_definitions` — no edge can exist with an undefined, ungoverned type. Trigger-based polymorphic foreign keys were intentionally avoided so that adding a new node type never requires a migration to `graph_edges` itself, only a new entry in `edge_type_definitions`.

**[NORMATIVE — direct quote]** Entity existence for `source_id`/`target_id` is validated by application services (the Retrieval Service, ES-010), not by the database.

## 4. Relationship vocabulary

**[NORMATIVE — Amendment 4, direct quote]**

> Every relationship type must explicitly specify: directional/bidirectional, transitive/non-transitive, unique/repeatable (per source node), confidence-aware/absolute, and time-dependent/permanent — as real, queryable metadata, not just RFC prose.

This is operationalized as five columns on `edge_type_definitions` (`directional`, `transitive`, `unique_per_source`, `confidence_aware`, `time_dependent`), populated for every seeded relationship type.

**[NORMATIVE — verbatim from the committed schema seed, `0003_knowledge_graph_schema.sql`]** The approved vocabulary, as amended by CTO review — `contradicts`, `inspired_by`, and `related_to` were explicitly deferred/excluded and are deliberately not seeded:

| Relationship | Source types | Target types | Directional | Transitive | Unique/source | Confidence-aware | Time-dependent | Description |
|---|---|---|---|---|---|---|---|---|
| `belongs_to` | concept | topic | ✓ | | | | | Categorical: a Concept belongs to a Topic. Many-to-many. |
| `authored_by` | publication, essay, framework, manifesto, principle | founder | ✓ | | ✓ | | | Authorship. Single-valued today (one Founder); becomes repeatable only if multi-author support is ever added. |
| `introduces` | publication | framework | ✓ | | ✓ | | | The originating document for a Framework. A Framework should have exactly one introducing Publication. |
| `references` | essay, publication | framework, publication, essay, concept | ✓ | | | | | Cites or mentions, without originating or deeply arguing. Non-transitive. |
| `explains` | essay, publication | concept | ✓ | | | | | The document's primary subject. Used sparingly by editorial convention — not every tangential mention. |
| `supports` | essay, publication | principle, framework, concept | ✓ | | | ✓ | | Provides argument or evidence for. The one edge type carrying a graded confidence value rather than being treated as a binary fact. |
| `operationalizes` | framework | principle | ✓ | | | | | Turns an abstract Principle into concrete, actionable steps — a Framework's own steps are the operationalization. |
| `expands` | essay, publication | essay, publication | ✓ | | | | | A deeper or follow-up treatment of an earlier piece's theme. Non-transitive by design. |
| `evolves_into` | framework | framework | ✓ | ✓ | ✓ | | ✓ | Framework versioning lineage only. Transitive via explicit multi-hop traversal, not implicit flattening. |
| `contains` | publication | evidence | ✓ | | | | | RESERVED — not yet actionable. See Amendment 2. |

A `null` confidence value on a `confidence_aware` relationship type (currently only `supports`) means "not yet scored," not zero — application code must treat it as such.

## 5. Amendments

**[NORMATIVE — Amendment 1]** Covered in §2 above: retain Concept as a first-class node distinct from Topic.

**[NORMATIVE — Amendment 2, direct quote]**

> Publication -> contains -> Evidence -> supports -> Principle. The evidence node type does not exist yet (deferred to a future spec); this row documents the reservation in schema, not just RFC prose.

The `contains` relationship type is seeded into `edge_type_definitions` now, even though its target node type (`evidence`) has no table, purely to record the reservation at the schema level.

**[NORMATIVE — Amendment 3, RECONSTRUCTED]** `distribution_edges` (planned under ES-014, "Distribution Graph") is deliberately a separate concern from the core Knowledge Graph and is not part of `graph_edges`.

**[NORMATIVE — Amendment 4]** Covered in §4 above: every relationship type must declare its five semantic axes explicitly.

## 6. Traversal

**[RECONSTRUCTED, paired citation with RFC-004 §2]** Per `0003_knowledge_graph_schema.sql`: "Supports the traversal patterns from RFC-003 §5 / RFC-004 §2 — lookups typically start from either end of an edge (find everything pointing INTO a node, or everything pointing OUT of one)." This motivated indexing `graph_edges` on both `(source_type, source_id)` and `(target_type, target_id)` rather than relying solely on the primary key. RFC-003 §5's own text beyond this indexing consequence is not recoverable — see `RFC-004-retrieval-architecture.md` for the retrieval-side half of this citation.

## 7. Implementation record

**[HISTORICAL]**

- **ES-006** (`0003_knowledge_graph_schema.sql`) — created `concepts`, `topics`, `principles`, `frameworks`, `edge_type_definitions` (seeded), `graph_edges`. Schema only; every table empty on merge.
- **ES-007** (`0005_graph_bootstrap.sql`) — populated Frameworks, Topics, Principles, and 2 `introduces` edges from existing repository/production content. Concepts explicitly deferred.
- **ES-008B** (`0007_promote_manifesto.sql`) — created the `manifesto` table as the 8th node type's (Manifesto's) canonical representation. Deliberately created as an isolated node: zero graph_edges reference it, because no seeded relationship type has `manifesto` as an applicable target, and Amendment 4's discipline against inferring unsupported relationship types was applied rather than worked around.
- **ES-009** (`0008_concepts_bootstrap.sql`) — populated `concepts` (3 rows) and connected them via `explains`/`belongs_to`/`supports` edges, per Amendment 1's Concept/Topic distinction.

## 8. Open items

**[UNKNOWN / UNRECOVERABLE]** RFC-003's full §1, §2, and the non-amendment portions of §3 and §5 are not recoverable beyond what is cited above. Whether additional amendments beyond 1–4 exist is unknown.
