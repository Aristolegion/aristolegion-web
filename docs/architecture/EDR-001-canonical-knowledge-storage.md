# EDR-001: Canonical Knowledge Storage

**Status:** Approved

**Provenance:** Reconstructed. No file matching this document was ever committed to this repository (confirmed via `git log --all --diff-filter=A`). This document was assembled from citations of EDR-001 in committed migrations and application code, and from the engineering decisions implemented under ES-008A and ES-008B, which executed it. Every clause below is tagged:

- **[NORMATIVE]** — a binding requirement, currently in force, evidenced by committed schema/code.
- **[HISTORICAL]** — describes a past state or a completed action; not itself a live requirement.
- **[RECONSTRUCTED]** — the wording here is paraphrased/assembled from citations rather than quoted verbatim; lower confidence than a direct quote.
- **[UNKNOWN / UNRECOVERABLE]** — belongs in this document but cannot be recovered from the repository.

---

## 1. Decision

**[NORMATIVE — direct quote, attested identically in three separate citations]**

> "Supabase becomes the canonical knowledge repository... Static TypeScript files are a transitional compatibility layer and will be retired after migration and cutover."

This sentence is quoted near-verbatim and identically in `supabase/migrations/0006_promote_static_content.sql` and `supabase/migrations/0007_promote_manifesto.sql`, and paraphrased consistently in `lib/content/essays.ts`, `lib/content/library.ts`, `app/library/page.tsx`, and `app/manifesto/page.tsx`. Its consistent, unmodified recurrence across five independently-authored files is the strongest evidentiary signal of any reconstructed clause in this document set.

## 2. Scope

**[RECONSTRUCTED]** EDR-001 governs where Aristolegion's knowledge content — essays, publications, the Manifesto, and (via RFC-003) the graph taxonomy built on top of them — lives at rest. Its normative direction: the database (Supabase/Postgres) is canonical; TypeScript source files under `lib/content/` are a transitional layer only, expected to be retired as each content type is promoted.

**[UNKNOWN / UNRECOVERABLE]** The original document's stated rationale (why Supabase over alternatives), any alternatives considered, and its original scope boundaries are not recoverable from this repository — only the decision statement and its downstream consequences survive.

## 3. Pre-EDR-001 baseline

**[HISTORICAL]** Immediately prior to the work that executed this decision, only five tables existed in the schema (the Epic 1 baseline): `publications`, `essays`, `newsletter_issues`, `newsletter_subscribers`, `inner_circle_applications` (per `supabase/migrations/0003_knowledge_graph_schema.sql`'s SCOPE NOTE, confirmed live against production immediately before that migration was authored). At that point, essays, "The Glass Partition" publication, the Manifesto, and the site's taxonomy lists (`pillars`/`domains` in `lib/content/homepage.ts`, `lib/content/essayCollections.ts`, `lib/content/founderResearchInterests.ts`) were all static TypeScript, not database rows.

## 4. Implementation record

**[HISTORICAL — each item below is a completed action, evidenced by a committed, applied migration]**

| Content | Action | Spec | Migration |
|---|---|---|---|
| 3 static essays + "The Glass Partition" publication | Promoted into `essays`/`publications` tables, copied verbatim from source | ES-008A | `0006_promote_static_content.sql` |
| Manifesto (`lib/content/manifesto.ts`) | Promoted into a new, singleton `manifesto` table (fixed id `a6707782-1b6b-401e-a510-efb1cce8f82d`), copied verbatim | ES-008B | `0007_promote_manifesto.sql` |
| `pillars`/`domains`/`essayCollections`/`founderResearchInterests` taxonomy lists | Consolidated into the `topics` table (11 rows) | ES-006/ES-007 | `0003_knowledge_graph_schema.sql`, `0005_graph_bootstrap.sql` |

`0006` additionally added three nullable, additive columns to `publications` (`content jsonb`, `external_link_label text`, `external_link_url text`) to hold "The Glass Partition"'s sectioned body content and external-purchase link — structural gaps identified during ES-008A's repository inspection, not part of EDR-001's decision text itself but a direct consequence of executing it.

**[HISTORICAL]** Both `app/library/page.tsx` and `app/manifesto/page.tsx` carried a temporary static-data fallback during a staged deployment window. Per their own code comments, migrations `0003`–`0007` were applied to and verified in production on 2026-07-24, after which the fallback was removed — the point at which the "will be retired after migration and cutover" clause was actually fulfilled for essays, publications, and the Manifesto.

**[HISTORICAL]** `lib/content/essays.ts` and `lib/content/library.ts` remain in the repository as empty arrays rather than being deleted — documented in both files as a deliberate "escape hatch" for future content that needs to ship before further CMS tooling exists. This is a current implementation detail, not a reversal of the canonical-storage decision.

## 5. Cross-references

- **ES-006** (`0003_knowledge_graph_schema.sql`) / **ES-007** (`0005_graph_bootstrap.sql`) — established the graph schema and taxonomy tables this decision's scope extends to.
- **ES-008A** (`0006_promote_static_content.sql`) — executed this decision for essays and "The Glass Partition."
- **ES-008B** (`0007_promote_manifesto.sql`) — executed this decision for the Manifesto.
- **ES-009** (`0008_concepts_bootstrap.sql`) — extends the canonical graph with Concepts; does not revisit this decision.

## 6. Open items

None identified as unimplemented. Every content type EDR-001 is cited against in this repository (essays, "The Glass Partition," Manifesto, taxonomy) has a completed promotion migration.
