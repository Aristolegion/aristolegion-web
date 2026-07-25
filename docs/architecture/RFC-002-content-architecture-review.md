# RFC-002: Content Architecture Review

**Status:** Historical Architecture Review. This document's node-model proposals were superseded and extended by RFC-003. Its structural findings (§1, taxonomy duplication) were resolved by ES-006/ES-007. Its recommendations at §5 and §8 are recorded below as **Historical Recommendations** — they are not current requirements, and their implementation status is stated explicitly per item, not assumed.

**Provenance:** Reconstructed. No file matching this document was ever committed to this repository. This document was assembled from citations of RFC-002 in `supabase/migrations/0003_knowledge_graph_schema.sql` and `0005_graph_bootstrap.sql`, restricted to findings and recommendations that are directly evidenced by the repository and by implemented work — nothing here is invented to fill out a "typical" architecture review's shape.

Tag legend: **[NORMATIVE]** binding, currently in force · **[HISTORICAL]** past state or finding, not itself a live requirement · **[RECONSTRUCTED]** paraphrased/inferred from citations · **[UNKNOWN / UNRECOVERABLE]** belongs here but not recoverable.

---

## 1. Finding: Framework fragmentation (§1)

**[HISTORICAL — finding, resolved]** RFC-002 §1 identified that "Capability Dividend™ exists in four disconnected places" — Framework content duplicated across the codebase with no single canonical representation (per `0003_knowledge_graph_schema.sql`: "resolves the 'Capability Dividend™ exists in four disconnected places' fragmentation named repeatedly since RFC-002 §1").

**Resolution status:** Implemented. ES-006 created a first-class `frameworks` table; ES-007 populated it from the then-existing sources and connected it to originating Publications via `introduces` edges.

## 2. Finding: Duplicated taxonomy lists

**[HISTORICAL — finding, resolved]** RFC-002 identified four duplicated static taxonomy lists with no shared, queryable representation: `lib/content/homepage.ts`'s `pillars` and `domains`, `lib/content/essayCollections.ts`, and `lib/content/founderResearchInterests.ts` (per `0003_knowledge_graph_schema.sql` and `0005_graph_bootstrap.sql`).

**Resolution status:** Implemented. ES-006 created a `topics` table; ES-007 consolidated the four lists into 11 Topic rows, using an explicit, disclosed consolidation rule (title-identical or near-verbatim-description entries merge; thematic similarity alone does not).

## 3. Node-model proposal (predecessor to RFC-003)

**[HISTORICAL]** RFC-002 originally proposed a Knowledge Graph node-type set that did not include Principles as a distinct type — RFC-003 §3 later added Principles "beyond what RFC-002 originally proposed" (`0003_knowledge_graph_schema.sql`). RFC-002's own original node-type proposal, prior to that extension, is not recoverable in detail — only that it existed and was narrower than RFC-003's final set.

**[RECONSTRUCTED]** Frameworks' promotion to a first-class, DB-backed entity is attributed jointly to "RFC-002/RFC-003" in `0003_knowledge_graph_schema.sql`, suggesting RFC-002 first proposed Frameworks as a node type and RFC-003 carried that proposal forward unchanged.

## 4. Historical Recommendation: additive audit columns (§5/§8)

**[HISTORICAL RECOMMENDATION — NOT IMPLEMENTED]** RFC-002 §5/§8 identified a gap: `updated_at`/`archived` additive columns were missing on `publications`, `essays`, and `newsletter_issues`. `0003_knowledge_graph_schema.sql` explicitly lists this as "correctly out of scope" for ES-006 — described in that migration's own words as "real, identified gaps... but not part of this spec's approved scope."

**Current status, as of ES-009:** Still not implemented. No migration in the repository (0003 through 0008) adds these columns. This recommendation remains open. It is recorded here as a historical recommendation, not as a current requirement this document set imposes — closing it, if desired, is a scoping decision for a future spec, not something this documentation effort resolves.

## 5. Historical Recommendation: Principle version history (§8)

**[HISTORICAL RECOMMENDATION — PARTIALLY IMPLEMENTED]** RFC-002 §8 recommended that Principles, like Frameworks, get full version history — the same `evolves_into` lineage tracking. `0003_knowledge_graph_schema.sql` states the `principles.version` column "supports RFC-002 §8's recommendation that Principles (like Frameworks) get full version history."

**Current status, as of ES-009:**
- **Implemented:** `principles` has a `version integer not null default 1` column (ES-006).
- **Not implemented:** the `evolves_into` relationship type's `applicable_source_types`/`applicable_target_types` are `[framework]`/`[framework]` only (per the RFC-003 vocabulary table — see `RFC-003-knowledge-graph-architecture.md` §4). No lineage edge type currently accepts `principle` as source or target, so Principle version *lineage* (as opposed to a bare version number) is not actually traversable in the graph. No Principle has ever been versioned past `1` in production as of ES-009.

This is recorded as a partially-implemented historical recommendation, not a current requirement.

## 6. Cross-references

- **RFC-003** — direct successor; extended RFC-002's node-type proposal (added Principles) and carried forward the Frameworks-as-node-type and `evolves_into` versioning ideas.
- **ES-006** (`0003_knowledge_graph_schema.sql`) — resolved the Framework-fragmentation finding (§1) and created the taxonomy/version-column scaffolding.
- **ES-007** (`0005_graph_bootstrap.sql`) — resolved the taxonomy-duplication finding by consolidating the four lists into `topics`.

## 7. Unknown / unrecoverable

**[UNKNOWN / UNRECOVERABLE]** RFC-002's full section structure (§2–§4, §6–§7, and anything beyond §8) is not recoverable. Only §1, §5, and §8 are attested by citation, along with the taxonomy-duplication finding and the Frameworks/Principles node-type discussion. Whether RFC-002 covered content types beyond Frameworks and Topics (e.g. Essays, Publications, editorial workflow) is unknown — no citation touches on that.
