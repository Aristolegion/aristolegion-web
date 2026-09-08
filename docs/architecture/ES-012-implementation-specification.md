# ES-012: Implementation Specification

**Status:** Draft — submitted for CTO review. Not yet approved. **This document does not authorize implementation.** No file under `lib/advisor/*`, no `app/api/advisor/route.ts`, and no dependency is created or modified by it.

**Scope:** This document translates the ratified `docs/architecture/ES-012-evidence-sufficiency.md` (committed at `5410fb1f`) into a concrete engineering design: exact processing order, exact data contracts, exact module boundaries, and exact treatment of every genuinely open engineering question the Evidence Sufficiency Specification deliberately left to "a future implementation specification." It does not re-decide anything that specification already ratified.

**Relationship to the ES-012 Evidence Sufficiency Specification:** That document is the authoritative policy contract — eligibility criteria, the two sufficiency gates, the 80% mechanism, the published-only policy, and their rationale. This document assumes all of it as given and does not restate the reasoning behind ratified decisions, only their engineering implications. Where this document proposes a specific mechanism for something the Evidence Sufficiency Specification deliberately tagged `[IMPLEMENTATION-SPEC DECISION]`, that proposal is exactly what this document exists to make — it does not reopen the policy those decisions sit inside.

**Relationship to ES-011:** `lib/retrieval/index.ts` and `lib/retrieval/types.ts` are read, never modified, throughout this document. Every dependency on ES-011 is on its existing public export (`retrieve`) and existing public types (`RetrievalResult`, `RetrievalCandidate`, `Source`, `RetrievalOutcome`). One concrete constraint this produces is noted explicitly in §E: ES-011's `NODE_TABLE_BY_TYPE` mapping and its candidate-grouping helper are private to `lib/retrieval/index.ts` — not exported — so Advisor-layer code needs its own copy of the same mapping rather than importing ES-011's internal one. This is a duplication cost accepted here specifically so that ES-011 does not need to change its export surface at all.

**Implementation principles**, carried forward from the ratified contract and from this repository's own established conventions (confirmed directly against `lib/embeddings/provider.ts`, `lib/supabase.ts`, `lib/sanctum/rateLimit.ts`, and every existing `app/api/*/route.ts`):

- Every external call uses a discriminated `{ok: true, ...} | {ok: false, status, message}` result shape, matching every existing provider module in this codebase. No exceptions propagate across module boundaries as the primary error-handling mechanism.
- No SDK dependency for the generation provider, matching the embeddings provider's raw-`fetch` convention.
- No new persistence, no new schema, no new vector store, matching ES-011's and RFC-007's own posture.
- Small, single-purpose modules, matching `lib/embeddings/`, `lib/retrieval/`, `lib/sanctum/`'s existing directory shape.
- Structural logging only, never raw question text, matching RFC-007 §N and ES-011's own logging convention.

---

## A. End-to-End Processing Pipeline

The brief for this document proposed:

```
request → validation → retrieve() → candidate eligibility → canonical source
expansion → relevance judgment → conflict judgment → question facet
identification → coverage judgment → source coherence judgment → 80%
evaluation → grounded context → generation
```

Two changes to this sequence are necessary, both driven by what the actual data dependencies require, not by preference.

**First: "candidate eligibility" is not one step — it splits around canonical source expansion.** E1 (Attribution Integrity) needs only `RetrievalCandidate.sourceStatus`/`.source`, already present the moment `retrieve()` returns. E2 (Publication State) and E3 (Canonical Content Availability) both need data — a status column, a content column — that only exists after the expansion step in §E runs, because `RetrievalResult` carries no status or body-content field for any node type (confirmed directly against `lib/retrieval/types.ts`). So the real order is: **E1 first, immediately after retrieval, on retrieval data alone** → candidates failing E1 are dropped, before anything is spent expanding them → **expansion runs only on E1-survivors** → **E2 and E3 evaluated against the expansion result.** This is also the cost-efficient order: a candidate that fails attribution has no source to expand in the first place, so checking E1 first avoids querying content for candidates that were already going to be discarded.

**Second: question facet identification has no dependency on retrieval or eligibility at all.** It operates purely on the question text. It can run concurrently with `retrieve()` and eligibility processing rather than waiting for them, which is a latency optimization, not a policy change — the two outputs (facets, relevant subset) still have to both exist before Question Coverage can run.

Revised pipeline:

```
1. Request validation                                    (§B)
2. Rate-limit check                                       (§Q)
   ── in parallel from here ──
3a. retrieve()                                            (§C)          3b. Question facet identification (§G)
3a-i.   E1: Attribution Integrity, on retrieval data       (§D)
3a-ii.  Canonical Source Expansion, on E1-survivors        (§E)
3a-iii. E2 + E3, on expansion output                       (§D, §E)
   ── eligible set now exists; join with 3b's facets ──
4. Gate A: Relevance Judgment, per eligible candidate      (§F)
   → if relevant subset is empty: outcome = insufficient_no_relevant_evidence, stop
5. Gate B: Conflict Detection, pairwise over relevant subset (§I)
   → if any pair contradictory (or undeterminable): outcome = insufficient_conflict, stop
6. Question Coverage, per facet against relevant subset    (§H)
7. Source Coherence, per pair, reusing Gate B's pair data  (§J)
8. 80% Evaluation                                          (§K)
   → if below threshold: outcome = insufficient_coverage_or_coherence, stop
9. Grounded Context Construction                           (§M)
10. Generation                                             (§N)
```

Retrieval failure (`retrieve()` returns `{ok: false}`) short-circuits at step 3a to the Retrieval Failure outcome; nothing downstream runs. This is unchanged from ES-011's own contract and RFC-007 §M.

## B. Request Validation

No shared validation middleware exists anywhere in this codebase — every route (`app/api/newsletter/subscribe/route.ts` is the clearest example) inlines its own checks directly in the `POST` handler, wrapping `request.json()` in a `try/catch` and returning `Response.json({success: false, error}, {status: 400})` on failure. ES-012's route should follow the identical pattern rather than introducing a validation library, which would be a new dependency for no repository-demonstrated need.

Minimum checks, in order: (1) body parses as JSON; (2) a `question` field exists and is a `string`; (3) trimmed, it is non-empty; (4) it does not exceed a maximum length. **The maximum length value itself is not chosen here** — no repository precedent gives a number for user-submitted question length, and one exists only for cost and abuse-surface reasons that belong with the rate-limiting numbers in §Q, not as an isolated guess. Flagged in §Y.

Nothing else is required in the request body for v1. Whether an API key, session, or other credential is also required is an authentication question, addressed in §P — not a validation question.

## C. Retrieval Boundary

Advisor calls `retrieve(question)` exactly as ES-011 exposes it — no new parameter, no wrapper that changes its behavior. The only option ES-011 accepts, `matchCount`, defaults to 10; whether Advisor should request a different count is untested against real evaluation data and is listed as an open parameter in §Y rather than changed speculatively here.

`retrieve()`'s `{ok: false}` outcome maps directly to RFC-007's Retrieval Failure state. Advisor adds no interpretation to this — ES-011 has already distinguished `validation`/`embedding`/`vector_retrieval` failure stages internally and logged accordingly; Advisor's only job is to stop the pipeline and surface an outcome, not to inspect or re-log ES-011's internal stage detail.

**A required step before anything else touches the candidate list, not present in ES-011 itself:** deduplicate `RetrievalResult.candidates` by `(nodeType, nodeId)`, keeping the lowest-`distance` (best-ranked) occurrence of each. This is necessary because `retrieve()`'s underlying `match_node_embeddings` RPC operates over `(node_type, node_id, chunk_index)` rows (confirmed in migration `0010`), and ES-011's own `RetrievalCandidate` type carries no `chunk_index` field — if a single node were ever indexed as more than one chunk, `retrieve()` would return it as two indistinguishable-looking candidates with different distances. **Confirmed directly in the reconciliation worker** (`app/api/internal/embeddings/reconcile/route.ts`): `chunk_index` is hardcoded to `0` and the surrounding comment states plainly, "No trigger, no queue, no chunking logic, no application consumption" exists today. So this case does not currently occur in production — but Advisor should not silently assume it never will, since nothing in ES-011's contract guarantees single-chunk-per-node, only today's embedding pipeline happens to produce it. Deduplicating costs nothing when the input already has no duplicates, and prevents the same underlying source from later being miscounted as two independent, corroborating pieces of evidence in Gate B or Source Coherence (§I, §J) — where "two sources agree" would be meaningless if they were the same source twice.

## D. Eligibility Processing

Three criteria, exactly as ratified (E1 Attribution Integrity, E2 Publication State, E3 Canonical Content Availability), split by data dependency as established in §A:

**E1**, on retrieval data alone: `sourceStatus === "ok" && source !== null`. Deterministic, no further mechanism needed — this is a direct read of already-computed ES-011 output.

**E2**, on expansion output (§E): for node types carrying a status column — `essay`, `publication`, `framework`, `manifesto`, confirmed directly against the schema — pass iff the column equals that type's published value (`'published'` for the first three, and manifesto; `'Published'`, capitalized, for `framework` — confirmed via each table's own `check` constraint). For node types with no status column at all — `concept`, `topic`, `principle`, confirmed by their absence from every migration that defines those tables — the criterion is **not applicable** and passes structurally, exactly as the ratified specification requires; there is no "unpublished concept" possible in the current schema, so there is nothing to fail here.

**E3**, on expansion output: pass iff the normalized content field (§E) is non-null and non-empty. A content field that is `null` (the common case for `publications.content`, populated for only one row as of migration `0006`) or an expansion query that finds no row at all both fail this criterion — see §E for the distinction between "confirmed absent" and "lookup failed," which matters for §S's failure semantics even though both currently collapse to the same E3 result.

Overall eligibility: `eligible` iff E1, E2, and E3 all resolve to pass (or not-applicable, for E2 on status-less types). A candidate failing any one of the three never proceeds to Gate A.

## E. Canonical Source Expansion

Grouped one `supabaseSelect` call per distinct node type present in the E1-surviving batch, using the `filter: {id: "in.(...)"}` shape `lib/supabase.ts`'s existing `supabaseSelect` already supports — the identical pattern ES-011's own (private) `fetchSourceAttribution` uses internally. Because `supabaseSelect` only ever issues `select=*` (there is no column-selection parameter in the current helper, confirmed by reading its implementation), **one query per node type returns every column needed for both E2 and E3 in a single round trip** — no separate query for status versus content.

Advisor needs its **own copy** of the node-type-to-table mapping ES-011 keeps private:

```
essay        -> essays
publication  -> publications
framework    -> frameworks
concept      -> concepts
topic        -> topics
manifesto    -> manifesto
principle    -> principles
```

This is deliberate duplication rather than an ES-011 change, per this document's constraint not to touch ES-011's export surface. It is a **constrained duplication caused by ES-011's frozen, private internals**, not a preference — `NODE_TABLE_BY_TYPE` and the grouping helper it feeds are not exported from `lib/retrieval/index.ts`, and this document does not propose changing that. The duplication carries real synchronization risk, acknowledged explicitly rather than left implicit:

- Advisor's copy of this mapping must remain identical to ES-011's for every node type ES-011 supports — a silent divergence would mean Advisor and ES-011 disagree about which table backs a given node type, with no compiler or runtime check to catch it.
- The Advisor copy must be reviewed by hand whenever ES-011 introduces or changes a supported node type, since nothing currently makes that change visible to Advisor automatically.
- Implementation should include a lightweight consistency check where practical — for instance, a small script or startup assertion that both mappings cover the same node types — though the exact mechanism is left to implementation, not fixed here.
- None of the above is authorization to export ES-011 internals or otherwise modify `lib/retrieval/index.ts`. It is documented technical debt and an ongoing synchronization risk to be managed, not a problem this document resolves by changing ES-011.

Per-type identity, content, and status field mapping — verified directly against `supabase/schema.sql` and migrations `0003`, `0004`, `0006`, `0007`:

| Node type | Identity | Raw content field | Status field | Normalization |
|---|---|---|---|---|
| essay | `title`, `slug` | `content` (markdown text, `not null`) | `status` (`'draft'`\|`'published'`) | Pass through as-is. It is already flat text; existing consumers (`lib/markdown.ts`) parse the same `##`/blank-line/`> ` grammar for display, but neither a semantic judgment mechanism nor a generation model needs that parsed — markdown is ordinary readable text to both. |
| publication | `title`, `slug` | `content` (jsonb, **nullable**) | `status` | When non-null, `content` is an array of `{heading, paragraphs: string[], quote?: string}` (confirmed directly against migration `0006`'s insert). Normalize by concatenating, per section, in array order: heading, then each paragraph, then the quote if present. When null (the common case today — only one row is populated), E3 fails; there is nothing to normalize. |
| framework | `title`, `slug` | `description` (text, `not null`) + `steps` (jsonb, **nullable**) | `status` (`'Research Development'`\|`'Published'`) | `description` is already flat text. `steps`, when present, is a flat array of short strings (confirmed against migration `0005`'s insert, e.g. `["Knowledge", "Skill", "Judgment", "Capability", "Impact"]`) — append as an ordered list, e.g. "Steps: Knowledge, Skill, Judgment, Capability, Impact." When `steps` is null, use `description` alone; this does not fail E3, since `description` is independently `not null`. |
| concept | `title`, `slug` | `summary` (text, `not null`) | none — not applicable | Pass through as-is. |
| topic | `title`, `slug` | `summary` (text, `not null`) | none — not applicable | Pass through as-is. |
| manifesto | `title`, `slug` | `sections` (jsonb, `not null`) | `status` | Same section-array family as `publications.content`, but confirmed to also include a `list` variant alongside `paragraphs` (the "Core Values" section uses `list: string[]` instead of `paragraphs`, per migration `0007`'s actual insert data). Normalize per section: heading, then `paragraphs.join(...)` if present, then `list.join(", ")` if present instead, then `quote` if present. Do not invent a summary of the Manifesto as a whole — flatten what exists, verbatim, section by section. |
| principle | none (no `title` column) | `text` (already present in ES-011's own `Source` object — no expansion query needed for content) | none — not applicable | Already flat; `text` serves as both identity and content, exactly as ES-011's discriminated `Source` union already models it. |

Nullability handling is the same for every type: a `null` or empty normalized content string is an E3 failure, not something papered over with a placeholder string. An expansion query that fails outright (network/infrastructure error, distinct from a confirmed-null column) is logged differently internally — see §S — even though both currently resolve to the same E3 outcome externally, mirroring the exact distinction ES-011's own `fetchSourceAttribution` already draws between a failed lookup call and a successful call with no matching row.

## F. Gate A: Relevance Judgment

**Contract requirement, already ratified and not reopened here:** the Evidence Sufficiency Specification requires a genuine semantic relevance judgment for Gate A, and explicitly rules out two mechanisms as insufficient on their own — a bare lexical/keyword check (its own §H false-positive-risk bullet names this) and any distance-based threshold (§J states plainly that a fixed number cannot distinguish shared vocabulary from shared subject). Both exclusions are treated as fixed facts below, not questions.

Four mechanisms were compared for "is this eligible candidate substantively relevant to what the user is asking":

**Deterministic (lexical/keyword) logic alone.** Cheap, fully auditable, no external call. Rejected as the primary mechanism: this is exactly the failure mode the ratified specification's §H false-positive-risk bullet already names — a lexical check is "susceptible to the same vocabulary-collision failure it exists to catch." A question and a source can share every keyword and still be about entirely different things (the ratified specification's own worked example: "judgment," "wisdom," "leadership," "capability" in ordinary, non-institutional use).

**Embedding/distance-based logic.** Already ruled out by the ratified contract itself, not merely disfavored here — §J states plainly that a fixed number "would not distinguish 'these two texts share vocabulary' from 'these two texts share a subject.'" Reintroducing a distance threshold at this layer would silently reverse a decision this document has no authority to reopen. Not proposed.

**Dedicated model judgment, narrowly scoped.** A call whose only question is "does this specific passage substantively address this specific question" — never "is this question institutional," which would be the general classifier the task instructions explicitly forbid building. Scoped correctly, this directly matches what the ratified specification anticipates as `[IMPLEMENTATION-SPEC DECISION]`.

**Hybrid: a cheap deterministic pre-filter, then model judgment on survivors.** The deterministic step's only job is to discard candidates with no meaningful term overlap at all (a near-zero-cost sanity check, not a relevance determination), reducing how many model calls are needed without ever being the mechanism that decides relevance.

**Current recommendation — a proposed implementation choice, not a ratified policy decision:** the hybrid approach, with the actual Gate A determination made exclusively by the narrowly-scoped model judgment, never by the pre-filter. This is this document's engineering recommendation for satisfying the contract requirement above; it is not itself ratified anywhere. Neither RFC-007 nor the Evidence Sufficiency Specification names a mechanism, and adopting this recommendation requires the same explicit implementation authorization as every other unresolved item in §Y. A different, equally valid mechanism could satisfy the same contract requirement without touching any ratified policy.

**The deterministic pre-filter is an optimization, not a decision.** It is not an eligibility criterion (§D), not a relevance decision, not a classifier, and not a source of truth for Gate A — its only function is reducing how many model calls are made; it never decides relevance itself, and Gate A's actual pass/fail never depends on it. It must be conservative enough that an absence of lexical overlap does not become a systematic false-negative mechanism for paraphrased or indirectly phrased institutional questions — a question that refers to a concept by description or synonym rather than its exact title must not be silently discarded before the model judgment ever sees it. During the evaluation procedure (§T), it must be possible to disable or bypass the pre-filter entirely, so its effect on outcomes can be measured independently of the model judgment's own behavior — without that, a pre-filter error could masquerade as a Gate A finding and never be detected as a separate failure mode.

- **Inputs:** the question text; one eligible candidate's identity (title, or text-as-identity for `principle`) and normalized content (§E).
- **Outputs:** `relevant` | `not_relevant` | `unknown` — a three-value result, not a score. `unknown` covers mechanism failure (timeout, provider error), never a semantic "maybe."
- **Per candidate or over the set:** per candidate, independently. Gate A's own pass condition (§H of the ratified specification) is "at least one eligible candidate is relevant" — that can only be evaluated from independent per-candidate judgments, not a single set-level call.
- **Failure behavior:** a candidate whose judgment is `unknown` is treated as not contributing to the relevant subset (fail-closed at the candidate level, consistent with the ratified specification's own fail-closed default). If **every** eligible candidate returns `unknown` — the mechanism itself is down, not merely returning negative judgments — this is a system fault, not an honest "no relevant evidence found," and must be distinguishable internally as such (§S) rather than silently logged identically to a real Gate A failure.
- **Latency/cost:** one model call per eligible candidate in the worst case (before dedup and pre-filtering reduce it). This is the first point in the pipeline with a real per-request cost profile — a reason rate limiting (§Q) must gate the request before this point, not after.
- **Vocabulary collision:** handled precisely because this mechanism reads content, not distance. A candidate that only shares vocabulary with the question should be judged `not_relevant` by a model actually reading both texts, which is the entire justification the ratified specification (§J) gives for Gate A existing as a distinct step at all.
- **Feeding Gate A's pass/fail:** Gate A passes iff at least one candidate's judgment is `relevant`; the set of `relevant` candidates becomes the relevant subset used by every downstream step.
- **Approval status:** the requirement that a semantic mechanism exist, and that it exclude lexical-only and distance-only approaches, is ratified. The specific hybrid design, the pre-filter, and the model-judgment scope described above are this document's proposed implementation choice, awaiting explicit implementation authorization — not a ratified decision in themselves.

## G. Question Facet Identification

**What is a facet:** a materially distinct sub-question or claim the question requires an answer to, such that omitting it would leave part of the question unaddressed. **What is not a facet:** rhetorical framing, restated context, or stylistic qualifiers requiring no evidence of their own ("I've been wondering for a while," "just curious," "quickly"). **Multi-part questions** ("What is Aristolegion's view on judgment, and how does that relate to the Capability Dividend framework?") decompose into as many facets as there are genuinely distinct claims — two, in that example. **Rhetorical phrases** are excluded from the facet list entirely, not counted as a facet that trivially "passes." **Nested questions** (an embedded premise plus a consequent question) decompose into, at most, the premise-check and the consequent — this document does not attempt unbounded recursive decomposition; a very high facet count for an ordinary single question is a signal of over-decomposition worth reviewing, not a hard limit enforced anywhere. **A single facet is sufficient** for a genuinely single-subject question — this is the expected, common case, not an edge case (§L of the ratified specification, restated here only insofar as facet identification must not artificially inflate a narrow question into several facets merely to make the percentage tier "feel" more populated).

**Facet-identification failure** — the decomposition step itself erroring, not merely uncertainty about one facet — is a system fault, not a legitimate zero-facet or trivially-satisfied state. See §K's explicit treatment of `N = 0` and §S's failure-semantics table: this must never be silently treated as "coverage trivially satisfied," which would let a malformed input bypass Question Coverage entirely.

**Deterministic versus model-assisted:** a purely deterministic approach (splitting on "and," on "?") is unreliable for natural language — it cannot distinguish a genuine second facet from a compound noun phrase ("leadership and judgment" as one subject, not two), and it will miss embedded facets a naive split can't see. **Recommended: model-assisted**, scoped narrowly to producing a list of facet descriptions, never an answer to them — the exact mechanism is `[IMPLEMENTATION-SPEC DECISION]`, consistent with every other semantic-judgment mechanism in this document.

## H. Question Coverage

- **Input:** the question, the identified facets (§G), and the relevant subset (§F).
- **Per facet:** `pass` if at least one relevant, eligible candidate's content substantively addresses that facet — "substantively" is the bar, not "mentions in passing," which is what folds the originally-proposed "evidentiary adequacy" criterion into this one rather than treating it separately (per the ratified specification's §K.7). `fail` if none do. `unknown` only if the per-facet judgment mechanism itself errors for that specific facet — excluded from both numerator and denominator, per the ratified specification's §K.4, not counted as a failure.
- **Source content considered:** the same normalized content (§E) used everywhere else; no separate representation is introduced for coverage specifically.
- **One source covering several facets:** unrestricted and expected — a single comprehensive essay satisfying every facet of a question is a pass on every one of them, not a special case requiring separate handling.
- **Effect on the 80% calculation:** each facet is exactly one atomic sub-check contributing to the combined denominator in §K, exactly as ratified.
- **Unknown handling:** identical to every other criterion's unknown treatment in this document — excluded from the count, never silently converted to pass or fail.

## I. Gate B: Conflict Detection

**Exactly what qualifies as a direct contradiction:** two relevant sources making mutually exclusive claims about the same specific point the question turns on — not merely the same general topic. If the question asks "what is Aristolegion's flagship framework" and one source names one framework while another denies any exists, that is a direct contradiction. Two sources discussing judgment from different angles, or at different depths, without making opposing claims about the specific thing asked, is not.

- **Inputs:** the relevant subset (post-Gate A) and the question (contradiction is only meaningful relative to what is actually being asked, not as an abstract corpus-wide consistency check).
- **Comparison scope:** pairwise, across every pair in the relevant subset.
- **"Same specific point":** the same discrete factual or normative claim the question raises — not "the same subject area."
- **Ambiguity handling:** preserved exactly as ratified — an inability to determine whether a pair is contradictory is fail-closed, treated the same as a confirmed contradiction for the gate's outcome. This is not softened here.
- **Mechanism-cannot-determine case:** logged distinctly from a confirmed contradiction internally (§S), even though both produce the same fail-closed gate outcome externally — this preserves the ability to tell "the evidence genuinely conflicts" apart from "the conflict-detection mechanism itself was uncertain," without changing the policy result either way.

**Avoiding duplicate machinery between Gate B and Source Coherence (§J):** rather than two separate per-pair mechanisms asking overlapping questions, this document recommends **one combined per-pair judgment**, returning a three-way classification per pair: `contradictory` | `coherent` | `incoherent_not_contradictory`. Gate B derives its pass/fail from a single question over this set — "does any pair classify as `contradictory` (or `unknown`)?" — while Source Coherence (§J) separately counts the `coherent` versus `incoherent_not_contradictory` classifications among the pairs that were *not* contradictory. This is one model call per pair, not two, and makes the "don't double-count Gate B" requirement structurally true rather than merely intended: a pair already flagged `contradictory` fails the whole evidence set at Gate B, before the percentage tier in §K is ever computed, so it is never available to be separately counted by Source Coherence at all.

## J. Source Coherence

- **Applicability:** only when the relevant subset has two or more members — with fewer, there are no pairs, and this criterion is excluded from the denominator entirely, exactly as ratified (§L, §K.6 of the Evidence Sufficiency Specification).
- **Input representation:** the same per-pair classifications produced in §I — `coherent` or `incoherent_not_contradictory` — restricted to pairs that survived Gate B (any `contradictory` pair already stopped the pipeline before this point is reached).
- **What constitutes coherence:** the pair, read together, supports a single plausible characterization relevant to the question without materially undermining each other.
- **What constitutes incoherence (short of contradiction):** a material inconsistency in framing or emphasis that falls short of the "same specific point, directly opposed" bar Gate B applies.
- **Pair count:** every pair among the relevant subset — all `C(|R|, 2)` of them, not a sample and not only adjacent-rank pairs, since any single incoherent pair is one independent atomic sub-check, and Source Coherence's purpose is to check the whole set coheres, not just its strongest members.
- **80% application:** each pair contributes one atomic sub-check to the same combined denominator Question Coverage contributes facets to — see §K.
- **Single-source case:** zero pairs, zero contribution to numerator or denominator — Question Coverage alone determines sufficiency, exactly as the ratified specification's §L requires.

## K. 80% Evaluation

This section implements the ratified formula precisely; it does not revisit whether ceiling rounding or the decomposition-based approach is correct — both are already ratified.

**N (applicable atomic checks)** = (number of identified facets, §G/§H) + (number of source-pairs evaluated, §I/§J — zero if the relevant subset has fewer than two members). Facets or pairs whose individual check resolved to `unknown` are excluded from N entirely, not counted toward it and not counted as failing it, per §K.4 of the ratified specification.

**Required passes** = `ceil(0.80 × N)`.

Worked out precisely for small N, since this is exactly where the ratified specification's §K.8 flags a real behavior worth understanding numerically rather than only qualitatively:

| N | 0.80 × N | Required passes (ceiling) | Effective threshold |
|---|---|---|---|
| 0 | — | — | **Not a valid sufficiency evaluation.** See below. |
| 1 | 0.8 | 1 | 100% |
| 2 | 1.6 | 2 | 100% |
| 3 | 2.4 | 3 | 100% |
| 4 | 3.2 | 4 | 100% |
| 5 | 4.0 | 4 | 80% (exact) |
| 6 | 4.8 | 5 | ~83.3% |
| 7 | 5.6 | 6 | ~85.7% |
| 8 | 6.4 | 7 | 87.5% |
| 9 | 7.2 | 8 | ~88.9% |
| 10 | 8.0 | 8 | 80% (exact) |

This sharpens, and confirms rather than contradicts, the ratified specification's own honest warning: ceiling rounding means the *effective* required rate is always at or above 80%, collapsing all the way to 100% for every N from 1 through 4, and only ever equaling exactly 80% when N is a multiple of 5. For most real questions against this corpus — typically one to a handful of facets, often a single relevant source with zero pairs — N will sit in the 1–4 range, where "80% sufficiency" and "every applicable check must pass" are the same policy in practice. This is a mathematical fact about the ratified formula at small N, not a deviation from it.

**Behavior when N = 0:** this should never occur under correct operation — Question Coverage always contributes at least one facet once Gate A has passed (a question that produced zero identifiable facets is a facet-identification failure, §G, an internal fault, not a legitimate empty set). `ceil(0.80 × 0) = 0`, and "0 of 0 checks passed" must **never** be read as vacuous, trivial success — an evidence set must not be allowed to pass sufficiency by having nothing left to check. If N = 0 is ever observed at runtime, it must be treated as the internal-fault outcome (§S), not as sufficient evidence.

**Granularity:** per evidence set, per question — equivalent in this single-turn v1 model, exactly as ratified (§K.3).

## L. Evidence and EvidenceSet Contracts

Conceptual field lists, not code — precise enough for direct translation into TypeScript, deliberately keeping raw signals, eligibility, semantic judgments, and sufficiency decisions in visibly separate groups so no later refactor can quietly blend them.

**EligibilityResult** (per candidate) — all fields required:
- `attributionIntegrity`: `"pass" | "fail"` (E1 is never `"unknown"` — ES-011 always resolves it to one of two values)
- `publicationState`: `"pass" | "fail" | "not_applicable"`
- `canonicalContentAvailability`: `"pass" | "fail" | "unknown"`
- `overall`: `"eligible" | "ineligible"` (derived)

**RelevanceResult** (per candidate, Gate A) — present only on candidates that reached this step (i.e., were eligible):
- `judgment`: `"relevant" | "not_relevant" | "unknown"` (required)

**Evidence** (per candidate):
- `nodeType`, `nodeId`, `rank`, `distance` (required — raw ES-011 signals, carried through for observability only; `distance` is never a gate or threshold anywhere in this contract)
- `relationshipContext` (required, possibly empty array — observability only, per the ratified specification's §F exclusion)
- `title` (required, absent only for `principle`) / `text` (required only for `principle`) — mirrors ES-011's own discriminated `Source` union exactly
- `slug` (required)
- `canonicalContent` (optional — present only when E3 resolved `pass`)
- `publicationStatus` (optional — present only for node types carrying a status column)
- `eligibility`: EligibilityResult (required)
- `relevance`: RelevanceResult (optional — absent for ineligible candidates, since Gate A is never evaluated for them)
- `finalStatus`: `"eligible_and_relevant" | "eligible_not_relevant" | "ineligible"` (required, derived)

**ConflictCheck** (per pair, within a relevant subset of size ≥ 2):
- `pairKey` (required — the two candidates' node identities)
- `classification`: `"contradictory" | "coherent" | "incoherent_not_contradictory"` (required — the combined judgment from §I)
- `mechanismUncertain`: boolean (required — true when the classification is a fail-closed assumption rather than a confirmed judgment, per §I)

**CoverageCheck** (per facet):
- `facetId`, `facetDescription` (required — the description exists for auditability, per §T)
- `result`: `"pass" | "fail" | "unknown"` (required)

**CoherenceCheck** (per pair, derived from non-contradictory `ConflictCheck` entries):
- `pairKey` (required)
- `result`: `"pass" | "fail"` (required — derived from `"coherent"` vs `"incoherent_not_contradictory"`; an `"unknown"` value should be structurally unreachable here, since a `mechanismUncertain` pair is already fail-closed at Gate B and never reaches this stage — kept out of the type rather than included and unused)

**SufficiencyResult** (evidence-set level, present only if Gate A and Gate B both passed):
- `gateA`, `gateB`: `"pass" | "fail"` (required)
- `coverageChecks`: CoverageCheck[] (required)
- `coherenceChecks`: CoherenceCheck[] (required, empty array when the relevant subset has fewer than two members)
- `applicableTotal`, `requiredPasses`, `actualPasses`: number (required — N, `ceil(0.80×N)`, and the observed count)
- `outcome`: `"sufficient" | "insufficient"` (required, derived)
- `rationale`: structured diagnostic text (required — which check(s) failed, for §T's evaluation use; never the raw question or source content itself)

**EvidenceSet** (top level, one per request):
- `allCandidates`: Evidence[] (required — every deduplicated candidate ES-011 returned, each carrying its own status)
- `relevantSubset`: Evidence[] (required, derived)
- `facetIdentificationStatus`: `"ok" | "failed"` (required — distinguishes "zero facets, correctly" from "facet identification itself broke"; there should be no case of the former once Gate A has passed, per §K's N=0 treatment)
- `facets`: facet descriptions (meaningful only when `facetIdentificationStatus` is `"ok"`)
- `sufficiency`: SufficiencyResult | null (null whenever Gate A or Gate B stopped the pipeline before the percentage tier ran)
- `outcome`: `"sufficient" | "insufficient_no_relevant_evidence" | "insufficient_conflict" | "insufficient_coverage_or_coherence" | "internal_fault"` (required — the master discriminator; `"internal_fault"` is the case §S requires be distinguishable from an honest insufficiency)

## M. Grounded Context Construction

**What is passed to generation:** only `Evidence` entries in `relevantSubset`, and only once `EvidenceSet.outcome === "sufficient"`. Never the full `allCandidates` list, never an ineligible or non-relevant candidate.

**Fields included per source:** `nodeType`, identity (`title` or `text`), `slug`, `canonicalContent`. **Fields deliberately excluded:** `distance` and `relationshipContext`. Distance is an internal retrieval-ranking artifact with no bearing on whether content is true or relevant once Gate A has already made that determination on the merits — exposing it risks reintroducing, inside the prompt, exactly the "closer must mean more relevant" assumption Gate A exists to replace. `relationshipContext` is observational-only throughout every gate and criterion in the ratified contract (§F); surfacing it to generation would let it regain influence in the one place — the model's own reasoning — where the contract could no longer see or govern it.

**Ordering:** by retrieval rank (ascending distance) is a reasonable, low-stakes default for presentation consistency, but it must not be presented to the model as a relevance ranking — no numeric scores or rank labels included. This is a minor implementation choice, not load-bearing policy.

**Multiple sources:** clearly delimited per-source blocks, attribution (type, identity, slug) preceding each block's content, so a generated answer's "structured sources" can be attributed per source rather than reconstructed after the fact.

**Attribution representation:** `nodeType` + identity + `slug` — sufficient to construct a citation or link without exposing any internal id, distance, or rank.

**Authoritative source list invariant:** the set of sources ever presented to the user as citations is derived exclusively from `EvidenceSet.relevantSubset` — the validated, sufficiency-gated evidence assembled in §D–§L. This list is fixed before generation runs and is never expanded, contracted, or redefined by anything the generation step subsequently returns. See §N and §O for what this means for handling the model's own output, which must not be treated as a second, competing source of source identity.

**Maximum source-content budget:** **not chosen here.** No generation call exists anywhere in this codebase yet, so no token-budget precedent exists to draw from, and the right number depends on whichever model is eventually chosen (§N) and its context window — a number invented now would be disconnected from that choice. Flagged in §Y as an implementation parameter.

**Truncation strategy:** when a budget is eventually set and content must be shortened, truncate at a natural boundary — paragraph or section for structured content, sentence for essays — never mid-sentence, and never in a way that could strip a qualifying clause while keeping its unqualified claim (cutting "X is true, except when Y" down to just "X is true" is a truncation bug, not a truncation detail). The exact algorithm is implementation-level; this constraint is not.

## N. Generation Interface

**Boundary:** generation receives only a `GroundedContext` object (question + the ordered, delimited source list from §M) — never a `RetrievalResult`, never raw `Evidence[]`, never anything Supabase- or graph-shaped. This should be enforced structurally, not just by convention: the generation module's only import from elsewhere in this codebase should be its own request/response types, mirroring exactly how `lib/embeddings/provider.ts` imports nothing from `lib/supabase.ts` or `lib/retrieval/*` today.

**Provider and model: not decided here, because nothing authorizes a choice.** RFC-007 §J is explicit that no provider is assumed and no model is named. The ratified Evidence Sufficiency Specification does not name one either — it is a contract about evidence, not about generation. Per this document's own instructions, a provider/model choice is listed as an open implementation decision (§Y), not silently imported from any prior conversation's claims about what may have been "frozen" — nothing in the committed repository or either ratified architecture document supports that claim, and repeating it here would misrepresent the actual authorized state.

**Conceptual interface:**
- Request: `{question: string, groundedContext: {sources: [{nodeType, identity, slug, content}]}}`
- Success response: `{ok: true, answer: string, usage?: {promptTokens, completionTokens}}` (usage fields present only if the eventual provider surfaces them — not guaranteed)
- Error response: `{ok: false, status: number, message: string}` — the exact shape every other provider module in this codebase already returns
- Timeout: must be bounded, not unbounded. No precedent for a synchronous, user-facing-latency third-party call exists anywhere in this codebase today — `generateEmbedding` has no timeout of its own, relying on the platform's function timeout, which is itself unspecified. The exact duration is an open parameter (§Y).
- Retry/single-attempt policy: **not ratified anywhere in the committed repository.** An earlier, non-authoritative account of this project's history claimed "single attempt, no retry" was a frozen decision; nothing in RFC-007 or the ratified ES-012 contract actually states this. It is listed, honestly, as unresolved in §Y rather than treated as settled.

**Model output is untrusted with respect to source identity.** If the eventual response format asks the model to echo back which sources it drew on, that structured metadata must be treated as untrusted output, never as an addition or alternative to the authoritative list fixed in §M. Concretely: parse it defensively against a fixed expected shape; for every source reference it contains, cross-check its identity (`nodeType` + `slug`, or equivalent) against `EvidenceSet.relevantSubset`; discard any reference that does not match an entry in that set. A model-generated slug, title, node type, or citation never becomes authoritative merely because the model produced it — authority comes only from having survived eligibility, Gate A, Gate B, and the 80% threshold, none of which the generation step participates in or can retroactively grant. When malformed or unauthorized source metadata is encountered, the safe degradation is to fall back to presenting the authoritative `relevantSubset` itself as the source list — already known-good and independent of the model's cooperation — rather than passing through whatever the model claimed. This is a degradation within the existing "successful grounded response" outcome (RFC-007 state 4, §S); it does not warrant and must not introduce a new outcome state solely for malformed source metadata.

## O. Prompt / Grounding Security

Four requirements, stated as constraints on the eventual prompt design rather than as the prompt text itself, per the instruction not to write production prompt language here:

1. **Structural separation.** System grounding policy, the user's question, and retrieved source content must occupy clearly distinct, non-interchangeable positions in whatever the eventual prompt construction looks like, such that text appearing in the question or in source content is never concatenated into a position a model would read as a system-level instruction.
2. **No tool or execution capability.** The generation call is pure text-in/text-out grounded question-answering. It should never be granted function-calling, browsing, or code-execution capability — there is no legitimate use for any of those in this feature, and granting them would turn a prompt-injection risk into an action risk.
3. **No knowledge-gap filling.** The grounding requirement already ratified (§R of the Evidence Sufficiency Specification) — that generation may use only evidence that passed the full contract — is a prompt-level instruction to the model, not something this document, or any purely prompt-based instruction, can mechanically guarantee against a sufficiently adversarial user. This should be stated as a best-effort mitigation, not an absolute proof, when the eventual implementation spec documents it.
4. **Source identity is never delegated to the model.** The model may be asked to write a grounded answer using the sources in the grounded context, and may optionally be asked to indicate which of those sources it drew on, but it must never be treated as authoritative on which sources exist, what their titles or slugs are, or what type they are. All of that is fixed before generation runs (§M) and is only ever verified against the model's output, never derived from it (§N).

Retrieved institutional content, though authored by Aristolegion itself, is treated with the same structural caution as user input for the purposes of requirement 1 — a future content row could, in principle, contain text that reads as an instruction, and the prompt construction should not depend on institutional content being "safe by origin."

## P. Public API Contract

**HTTP method:** `POST`, matching every other route in this codebase that accepts a body, including `app/api/newsletter/subscribe/route.ts`, the closest existing precedent for an anonymous, public, unauthenticated endpoint.

**Request shape:** `{question: string}` — minimal, matching the small-typed-payload convention already used throughout `app/api/*`.

**Response shape (success, sufficient evidence):** `{success: true, answer: string, sources: [{nodeType, identity, slug}]}`, following the `{success: boolean, ...}` envelope every existing route already uses.

**Response shape (insufficient evidence):** this is a valid outcome, not an error, per RFC-007 §H — it should not be represented as `success: false`, which would misrepresent a normal semantic result as a failure. A sketch: `{success: true, sufficientEvidence: false}` or an explicit outcome discriminator field. The exact field naming is an implementation choice, not ratified policy, and is listed as such in §Y.

**Status semantics:** `200` for both a generated answer and an honest insufficient-evidence outcome (both are the system working correctly); a `5xx`-range status for retrieval failure, evidence-processing infrastructure faults, and generation failure (matching the existing `502` convention `newsletter/subscribe` already uses for a downstream Supabase failure); `400` for request validation failures; `429` for rate-limiting (§Q).

**Error semantics:** `{success: false, error: string}` with a generic, non-diagnostic message to the client and full detail only in server-side `console.error` logs — the exact pattern `newsletter/subscribe` already follows.

**Authentication posture: unresolved, and left unresolved here.** RFC-007 §K marks this `[OPEN]` explicitly. Nothing in the ratified Evidence Sufficiency Specification decides it either — it is outside that document's scope. This document does not assume anonymous public access is authorized; it is listed in §Y precisely because assuming it would be exactly the kind of silent policy decision this task instructs against.

## Q. Rate Limiting and Abuse Controls

**Precedent:** `lib/sanctum/rateLimit.ts` — an in-memory, module-level `Map`, keyed by an arbitrary string, tracking attempt count within a rolling window and an optional block period. Its own comment is explicit about the trade-off: state resets on cold start and is not shared across concurrent instances, "an acceptable trade-off" because it "still meaningfully slows down automated guessing on a warm instance." The module's logic is already fully generic — nothing in it is specific to login attempts.

**Where it occurs:** before `retrieve()` is called at all, at the very top of the route handler, immediately after request validation. The reasoning: this endpoint's real cost begins at the embedding call inside `retrieve()` (a paid OpenAI call, per ES-010's existing usage) and compounds at Gate A/facet-identification/generation (each a further paid call). Gating only before generation, as a narrower design might, would still let unlimited free embedding and Supabase load through for every request that gets refused only at the sufficiency stage — the wrong place to start protecting cost.

**Failure semantics:** a blocked request returns `429`, mirroring `isBlocked`/`getRetryAfterSeconds`'s existing shape, optionally surfacing a retry hint.

**State required:** a per-key attempt record — count, window start, optional block-until timestamp — identical in shape to the existing `AttemptRecord`. The key itself (IP address or another anonymous identifier) is an implementation detail, not a policy one.

**What must remain configurable, not invented here:** the numeric attempt count, window duration, and block duration. `lib/sanctum/rateLimit.ts`'s existing constants (5 attempts / 15 minutes / 15 minutes) were tuned for a brute-force login threat model — guessing a password. Advisor's threat model is different: real, per-request dollar cost on a public, anonymous, generation-backed endpoint. Reusing login's numbers without reconsidering them would be arbitrary in the other direction. No specific numbers are proposed here; see §Y.

**New module versus reuse:** two options exist. Reusing `lib/sanctum/rateLimit.ts` directly (with an Advisor-specific key prefix) avoids a new file but currently shares its hardcoded constants with the login flow — not fully appropriate given the different threat model, unless that module is first made configurable per call-site, an additive but nontrivial change to a small, security-sensitive existing file. Creating a dedicated `lib/advisor/rateLimit.ts`, copying the same 51-line pattern with Advisor-appropriate constants, has zero blast radius on the existing login flow at the cost of minor duplication. **Recommended: the dedicated module** — the duplication cost is small and the risk of touching an existing security-sensitive file for a different feature's needs is not worth avoiding it.

## R. Observability and Privacy

**A correction to an earlier inspection, made here because it materially changes what's safe to log:** `next.config.ts`'s `compiler.removeConsole` is configured with `{exclude: ["error"]}`, but its own comment states plainly that in practice this "removes... only the three `console.log` calls in `components/inner-circle/ApplicationForm.tsx` (client-side debug leftovers)" — not server-side operational logging generally. The ES-012 Evidence Sufficiency Specification's §S over-generalized this into "production strips `console.log`/`warn`/`info`/`debug`" broadly; re-reading the actual comment corrects that. **Server-side `console.log` calls, in Route Handlers and `lib/*` server code, are not stripped in production** — ES-011's own `console.log("[retrieval] query complete", ...)` is a working, already-relied-upon example. This is a favorable correction, not a blocking one: it means Advisor's own structural logging can use plain `console.log`, matching ES-011's exact convention, with no special `console.error`-only workaround required.

**Structural telemetry per request** (every field here is a count, status, or duration — never content): retrieval outcome (ok/failure + stage); candidate count, pre- and post-deduplication (§C); per-criterion eligibility pass/fail counts; Gate A result and relevant-subset size; Gate B result; facet count; per-check coverage and coherence pass/fail counts; `applicableTotal`/`requiredPasses`/`actualPasses` (§K); final `EvidenceSet.outcome`; whether generation was attempted; generation outcome; latency, ideally per stage; token/cost metadata **only when the eventual provider actually surfaces it** — not fabricated if it doesn't.

**Persistence:** none, by default. This matches ES-011's own zero-persistence posture and RFC-007's explicit no-database-writes requirement. Structural console logs, captured by the platform's existing function-log infrastructure exactly as ES-010/ES-011 already rely on, are sufficient for v1 — no new `advisor_responses` table, no new schema.

**What must never be logged by default** (RFC-007 §N, already ratified — restated here as an implementation requirement, not a new decision): the raw user question text; the full content of any source; the generated answer text itself. The last of these is worth spelling out explicitly: even with a strict "no persistence" policy for the database, logging the answer text into operational logs is itself a form of retention with its own privacy exposure — if a user's question incorporated anything sensitive and the model's answer echoed it back, that would now live in log retention regardless of what the database does or doesn't store.

## S. Failure Semantics

The instruction this section exists to satisfy: infrastructure failures must never be silently presented, internally or externally, as an honest semantic "insufficient evidence" — doing so would mask a real system fault behind language that means something different ("the evidence said no" versus "we couldn't tell").

| Stage | Failure | Outcome |
|---|---|---|
| Request validation | Malformed body, missing/invalid `question` | `400`, no pipeline stage reached |
| Rate limiting | Key blocked | `429`, no pipeline stage reached |
| Retrieval | `retrieve()` returns `{ok: false}` | RFC-007 state 1, Retrieval Failure — there is no evidence to judge at all |
| Canonical source expansion | Query call fails (infrastructure) | **Internal fault**, distinct from E3 simply resolving `fail` on confirmed-absent content — logged distinctly per §E, same treatment ES-011 already applies to its own lookup failures |
| Gate A / facet identification / coverage / conflict-coherence mechanism | The judgment mechanism itself errors or times out for **every** candidate/facet/pair it was asked to evaluate | **Internal fault** (`EvidenceSet.outcome = "internal_fault"`) — this is "the mechanism couldn't run," never conflated with "the mechanism ran and found nothing relevant/no facets/no contradiction" |
| Gate A / Gate B / Coverage / Coherence, ordinary operation | An honest `not_relevant`, empty relevant subset, confirmed contradiction, or a genuine sub-80% result | RFC-007 state 2, Insufficient Evidence — the mechanism worked and the answer is no |
| Generation | Provider error, timeout | RFC-007 state 3, Generation Failure |
| Generation | Success | RFC-007 state 4, successful grounded response |

RFC-007's four public outcome states remain sufficient; no fifth state is being proposed. What this table adds is an internal distinction — a fault occurring during evidence processing (expansion or judgment) is neither a retrieval failure nor an honest insufficiency, and should be tracked as its own case in telemetry (§R) even though its external HTTP treatment may reasonably resemble retrieval failure's (a `5xx`, not a `200` with `sufficientEvidence: false`). The exact external response for this specific case is not fixed here — see §Y — but the internal bookkeeping that keeps it distinguishable from an honest "no" is not optional.

## T. Evaluation and Validation Procedure

Consistent with the ratified specification's §T, at implementation-level detail: an evaluation record is, in effect, a serialized `EvidenceSet` (§L) plus a human label of what the outcome should have been — no separate parallel schema is needed, since the internal data contract already carries every field §T (of the Evidence Sufficiency Specification) and item 20 of this task's brief require: question identifier, retrieval candidates with distances and `sourceStatus`, publication eligibility, content availability, relevance judgments, facets, coverage checks, the conflict result, coherence checks, `applicableTotal`/`requiredPasses`/`actualPasses`, the final `EvidenceSet.outcome`, and whether generation was allowed.

Run across the same five categories already established — clear institutional, indirect institutional, vocabulary collision, clear non-institutional, boundary ambiguous — this is a deliberate, offline validation exercise, not production telemetry: the raw question text is necessarily visible to whoever performs the human labeling, which is a different, consented context from the never-log-raw-text rule (§R) that governs production request handling.

**No test framework is being added for this.** This is a standalone validation procedure — plausibly a small script invoked outside the normal request path — not `npm run lint`/`npm run build`, and not unit tests (see §V for that, a related but distinct purpose: engineering correctness of individual cases, versus this section's purpose of validating whether the 80% policy itself behaves acceptably against realistic questions). **The 80% figure is not treated as validated by this document or by any evaluation described here** — it becomes validated only once this procedure has actually been run and its results reviewed, exactly as the ratified specification already insists.

## U. Module / File Architecture

Derived from this repository's existing conventions — small, single-purpose files; a `types.ts` separated from logic; a `provider.ts` pattern for any external call — rather than assumed from a generic template.

| Module | Responsibility | Depends on | Must not know about | Exports |
|---|---|---|---|---|
| `lib/advisor/types.ts` | Evidence/EvidenceSet/EligibilityResult/RelevanceResult/CoverageCheck/ConflictCheck/CoherenceCheck/SufficiencyResult type definitions only | `lib/retrieval/types.ts` (for reference to `Source`/`RetrievalCandidate` shapes) | Supabase, HTTP, generation | All types above |
| `lib/advisor/eligibility.ts` | E1 (from raw retrieval data) and, post-expansion, E2/E3 | `lib/advisor/types.ts`, `lib/retrieval/types.ts` | Generation, HTTP routing | Eligibility-checking functions |
| `lib/advisor/sourceExpansion.ts` | Canonical content/status lookup and per-type normalization (§E), including Advisor's own node-type-to-table mapping — a constrained duplication of ES-011's private internals carrying an explicit synchronization risk, see §E | `lib/supabase.ts`, `lib/advisor/types.ts` | Generation, HTTP, retrieval internals beyond public types | Expansion function(s) |
| `lib/advisor/relevance.ts` | Gate A (§F) | `lib/advisor/types.ts` | Supabase, HTTP | Relevance-judgment function |
| `lib/advisor/facets.ts` | Question facet identification (§G) | `lib/advisor/types.ts` | Retrieval, Supabase, eligibility | Facet-identification function |
| `lib/advisor/coverage.ts` | Question Coverage (§H) | `lib/advisor/types.ts`, facet output shape | Supabase, HTTP | Coverage-checking function |
| `lib/advisor/conflictAndCoherence.ts` | The combined per-pair judgment (§I) and its two derived views, Gate B and Source Coherence (§J), kept in one module specifically so the "no double-counting" guarantee is structurally visible in one place rather than split across two files that each half-implement it | `lib/advisor/types.ts` | Supabase, HTTP, generation | Conflict/coherence functions |
| `lib/advisor/sufficiency.ts` | Orchestrates §D–§K into one EvidenceSet → SufficiencyResult pipeline, including the 80% calculation | All other `lib/advisor/*` modules above | Generation, HTTP | Top-level sufficiency function |
| `lib/advisor/groundedContext.ts` | Builds the `GroundedContext` object from a sufficient `EvidenceSet` (§M) | `lib/advisor/types.ts` | Supabase, retrieval internals, the generation provider itself | Context-construction function |
| `lib/advisor/generationProvider.ts` | The generation call (§N), modeled on `lib/embeddings/provider.ts`'s raw-`fetch`, discriminated-result convention | Only `lib/advisor/types.ts`'s `GroundedContext`/generation-result shapes | Supabase, retrieval, eligibility, graph tables — enforced by accepting only a `GroundedContext` parameter | Generation function |
| `lib/advisor/rateLimit.ts` | A dedicated copy of `lib/sanctum/rateLimit.ts`'s pattern with Advisor-appropriate constants (§Q) | Nothing else in `lib/advisor/*` | Everything else in this table | `isBlocked`/`recordFailure`/`recordSuccess`-equivalent functions |
| `app/api/advisor/route.ts` | Parses/validates the request, checks rate limits, calls `retrieve()`, calls the orchestration pipeline, maps outcomes to HTTP responses — the only file permitted to import both `lib/retrieval/*` and `lib/advisor/*` together | All of the above | — | `POST` handler |

## V. Testing Strategy

No test framework exists anywhere in this repository (confirmed: no `jest`, `vitest`, or `playwright` in `package.json`), and none is added here. Consistent with how ES-008A, ES-008B, ES-010, and ES-011 were each actually validated — documented manual/synthetic checks plus `npm run lint` and `npm run build`, recorded in migration comments and specification completion reports rather than automated test suites — this section designs a validation-procedure-based approach, not a test suite.

Deterministic scenarios, each mapped to an expected `EvidenceSet.outcome` (and, where relevant, `SufficiencyResult` fields):

| Scenario | Expected outcome |
|---|---|
| No candidates returned by `retrieve()` | Not this pipeline's concern — `retrieve()` itself would need to return an empty, `{ok: true}` result; Gate A then fails on an empty eligible set, `insufficient_no_relevant_evidence` |
| All candidates fail E1 (unattributable) | Eligible set empty before Gate A even runs; `insufficient_no_relevant_evidence` |
| A candidate whose only status is draft | E2 fails for that candidate; if it was the only candidate, same as above |
| A candidate with confirmed-null/empty canonical content | E3 fails for that candidate |
| Vocabulary collision (candidates attributable, published, content-bearing, topically unrelated) | Gate A judges all `not_relevant`; `insufficient_no_relevant_evidence` |
| Single relevant source, single-facet question | Gate A passes (1 relevant); Gate B trivially passes (no pair exists); N = 1 (Coverage only); `sufficient` if that facet passes |
| Multi-facet question, one relevant source covering only some facets | N = facet count; some `CoverageCheck`s fail; outcome depends on whether required passes (§K's table) are met |
| Two relevant sources, direct contradiction | Gate B fails; `insufficient_conflict`, regardless of Coverage/Coherence |
| Two relevant sources, mild incoherence (not contradictory) | Gate B passes; one `CoherenceCheck` fails; contributes to N |
| N = 5, exactly 4 of 5 sub-checks pass | `sufficient` (§K: required = 4) |
| N = 5, exactly 3 of 5 pass | `insufficient_coverage_or_coherence` |
| N = 1, 2, 3, 4 — any single sub-check failing | `insufficient_coverage_or_coherence` in every case (§K: 100% required at these sizes) |
| Semantic-judgment mechanism fails for every eligible candidate | `internal_fault`, never silently `insufficient_no_relevant_evidence` |
| `retrieve()` returns `{ok: false}` | Retrieval Failure — pipeline never proceeds past §C |
| Generation provider errors after a `sufficient` outcome | Generation Failure — distinct from every evidence-related outcome above |

Each scenario should be exercised manually (or via a small standalone script, not a test framework) against the actual implementation, with results documented in a completion report — the same pattern already established for every prior ES specification in this repository.

## W. Security Boundaries

```
User input (raw HTTP body)
    │  [Boundary 1 — request validation, §B]
    ▼
Retrieval query (validated question text)
    │  [ES-011 itself — no new boundary concern, frozen and unmodified]
    ▼
Retrieved institutional data (Aristolegion's own content)
    │  [Boundary 2 — eligibility + Gate A/B + coverage/coherence, §D–§K:
    │   nothing here executes or interprets content as instructions,
    │   every step only classifies text]
    ▼
Grounded context (curated, filtered subset, §M)
    │  [Boundary 3 — prompt construction, §O: structural separation of
    │   policy / question / source content]
    ▼
Generation provider (external)
    │  [Boundary 4 — the model's own output is untrusted until validated;
    │   never executed, never assumed well-formed]
    ▼
HTTP response to user
```

Untrusted text enters the system at exactly two points: the raw question (always, from an anonymous public caller) and, with respect to instruction-injection risk specifically, the retrieved institutional content itself — authored by Aristolegion, but not therefore exempt from the structural separation §O requires, since a future content row could contain adversarial text without anyone having acted in bad faith to put it there. A third point worth naming: the model's own output must be treated as untrusted structured data before being returned to the caller — if "structured sources" in the response are meant to be a strict shape, response parsing must degrade gracefully on malformed model output rather than assume it is always well-formed.

## X. Dependencies and Platform Constraints

`package.json` currently declares exactly three runtime dependencies — `next`, `react`, `react-dom` — and no HTTP client, validation library, or test framework beyond what ships with Next.js/TypeScript/ESLint. Every existing external call in this codebase (`lib/supabase.ts`, `lib/embeddings/provider.ts`) uses native `fetch` with a hand-rolled discriminated result type, never an SDK.

Every requirement in this document can be met with what already exists: request validation with plain TypeScript checks (matching `newsletter/subscribe`'s own inline email-regex validation, no schema library); the generation provider with native `fetch`, whichever provider is eventually chosen, following `lib/embeddings/provider.ts`'s exact pattern; rate limiting with an in-memory `Map`, matching `lib/sanctum/rateLimit.ts`. **No new dependency is proposed by this document.** If a future implementation genuinely needs one — for instance, if the eventual chosen generation provider has no usable raw-HTTP interface, which is not the case for any mainstream provider today — that would be its own explicit, flagged implementation decision, not something installed here.

## Y. Open Implementation Decisions

Only engineering questions genuinely unresolved after this inspection — none of the following reopens the published-only policy, the 80% policy, ceiling rounding, single-source sufficiency, graph exclusion, distance-threshold exclusion, weighted-score exclusion, ES-011's immutability, or the evidence/generation separation, all of which remain exactly as ratified:

1. **Generation provider and model.** Neither RFC-007 nor the ratified ES-012 contract names one (§N).
2. **Authentication posture** for the public endpoint. RFC-007 §K marks this `[OPEN]` explicitly (§P).
3. **The exact semantic-judgment mechanism(s)** for Gate A, facet identification, Question Coverage, and the combined Gate B/Coherence pairwise judgment — all deliberately `[IMPLEMENTATION-SPEC DECISION]` in the ratified contract, and left that way here too (§F, §G, §H, §I).
4. **Whether relevance, facets, coverage, and conflict/coherence share one common underlying "judgment call" helper**, or each implements its own independently — a code-organization choice, not a policy one.
5. **Numeric rate-limiting thresholds** (attempt count, window, block duration) for the public endpoint — Advisor's cost-abuse threat model differs from Sanctum login's brute-force one, and no repository evidence justifies a specific number for either (§Q).
6. **Maximum request question length** (§B).
7. **Generation call timeout duration** — no precedent for a synchronous, user-facing third-party call exists anywhere in this codebase (§N).
8. **Maximum source-content budget for grounded context, and the exact truncation algorithm** — depends on the provider/model choice in item 1 (§M).
9. **Retry policy for generation failures** (single-attempt versus limited retry) — not actually ratified anywhere, despite an earlier, non-authoritative account of this project's history claiming otherwise (§N).
10. **The exact external HTTP/response-shape treatment of an "evidence-processing infrastructure fault"** — internally distinguishable from insufficient evidence (§S) by requirement, but its external status code and response shape are not fixed by RFC-007 or the ratified contract.
11. **Whether `lib/sanctum/rateLimit.ts` is generalized for reuse or a dedicated `lib/advisor/rateLimit.ts` is created** — a recommendation is given (§Q), not a final decision.
12. **The `matchCount` value Advisor requests from `retrieve()`** — ES-011 defaults to 10; whether Advisor should request a different count is untested against real evaluation data (§C).
13. **Exact response field naming/shape for the "insufficient evidence" success case** (§P) — a sketch is given, not a binding shape.

## Z. Implementation Sequence

1. `lib/advisor/types.ts` — contracts first, no logic, so every subsequent module has a fixed shape to build against.
2. `lib/advisor/sourceExpansion.ts` — needed by nearly everything downstream, and testable against real Supabase data immediately.
3. `lib/advisor/eligibility.ts` — depends only on types, `lib/retrieval/types.ts`, and expansion output.
4. `lib/advisor/relevance.ts` and `lib/advisor/facets.ts` — independent of each other; buildable in parallel once their judgment-mechanism decision (§F, §G) is made.
5. `lib/advisor/coverage.ts` and `lib/advisor/conflictAndCoherence.ts` — depend on steps 3–4's outputs.
6. `lib/advisor/sufficiency.ts` — orchestrates 1–5 into the full `EvidenceSet` → `SufficiencyResult` pipeline, including the 80% calculation.
7. `lib/advisor/groundedContext.ts` — depends only on a sufficient `EvidenceSet`.
8. `lib/advisor/generationProvider.ts` — fully independent of 2–7 once its interface (fixed by step 1) is settled; can be built and tested in parallel with the middle steps.
9. `lib/advisor/rateLimit.ts`.
10. `app/api/advisor/route.ts` — wires everything together last, since it is the only consumer of every module above.
11. The manual validation procedure (§V) run end-to-end against the assembled pipeline.
12. The five-category evaluation (§T) — only after which the 80% figure has any empirical support at all, and only after which this feature should be considered for production traffic.

Implementation should proceed incrementally, with validation and review at meaningful architectural boundaries rather than as one monolithic change — for example, once the core evidence pipeline (steps 1–6) is in place and before generation is wired in, and again before the route is exposed publicly — mirroring the validate-then-document discipline already established by ES-008A, ES-008B, ES-010, and ES-011, without prescribing a fixed review cadence as an architectural requirement of this specification itself.

---

This document is a specification draft. It does not authorize implementation of any file, route, or schema change. Proceeding to implementation requires separate, explicit approval — the same discipline the ratified Evidence Sufficiency Specification, RFC-006, and RFC-007 already apply to themselves. No contradiction between this document and the ratified Evidence Sufficiency Specification was found during its drafting; every apparent tension (small-N behavior at the 80% threshold, the Gate B/Source Coherence overlap risk, ES-011's private internals) has a workable implementation-level resolution documented above, and none required amending the ratified contract.
