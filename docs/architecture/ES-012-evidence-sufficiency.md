# ES-012: Evidence Sufficiency Specification

**Status:** Draft — submitted for CTO review. Not yet approved. **This document does not authorize implementation.** No code, migration, route, or `lib/advisor/*` file is created or modified by it. No ES number is formally assigned by this document alone — "ES-012" is used here only because it is the working label already anticipated, but never defined, by `supabase/migrations/0003_knowledge_graph_schema.sql` and by RFC-005/RFC-006/RFC-007's own forward references to an "Advisor layer, ES-012." Formal numbering and approval remain CTO decisions, not something this document grants itself.

**Scope:** This document defines the contract between ES-011 retrieval output and the evidence-sufficiency judgment that must occur before ES-012 generation is permitted to run. It does not specify generation itself, does not specify the public API surface, and does not resolve every open question RFC-007 leaves open — only the one RFC-007 §H explicitly assigns to a future document: "when is retrieved Aristolegion evidence sufficient for Advisor to be allowed to generate an answer."

**This document changes nothing in `lib/retrieval/index.ts`, `lib/retrieval/types.ts`, any Supabase migration, RFC-006, or RFC-007.** It is additive: a new consumer-side contract sitting between ES-011's existing output and a not-yet-built generation step.

**Relationship to RFC-007:** RFC-007 §H tags evidence sufficiency `[OPEN]` and states explicitly, "no numeric evidence threshold is invented" there. This document is the resolution RFC-007 itself calls for, not a revision of RFC-007. It does not resolve RFC-007's other open items — non-institutional-question handling (§G) remains unresolved and is not decided here (§O). Publication-state policy, previously an open dependency of this document, has since been ratified for the public Advisor v1 scope (§N); RFC-007's own text is unmodified, and this ratification applies only to this document's contract.

**Relationship to ES-011:** ES-011 remains, unmodified, the sole source of retrieval evidence. Every field this document reasons over — `distance`, `sourceStatus`, `source`, `relationshipContext`, `relationshipContextStatus` — is already produced by `retrieve()` today, confirmed directly against `lib/retrieval/index.ts` and `lib/retrieval/types.ts` at HEAD `c11b02f`. This document adds a judgment layer on top of that output; it does not ask ES-011 to produce anything it doesn't already produce, except where explicitly noted as depending on a new canonical-content-expansion step outside ES-011's own boundary (§I).

---

## A. Terminology

Adopting the tagging convention already established in RFC-007, for consistency across `docs/architecture/`:

- **[OPEN]** — a real decision this document deliberately leaves unresolved.
- **[DEFERRED]** — explicitly out of scope for this document, by design, revisited later.
- **[IMPLEMENTATION-SPEC DECISION]** — belongs to a future implementation specification, not this architecture document.
- **[UNKNOWN]** — no source answers this, and none is invented here.

## B. Architectural Position

```
User Question
    ↓
ES-011 retrieve()                          — unmodified, per RFC-006/§F
    ↓
RetrievalResult.candidates                 — distance, sourceStatus, source,
                                              relationshipContext, as ES-011
                                              already returns them
    ↓
Tier 1 — Eligibility (per candidate)       — §D–§G below
    ↓
Eligible Set
    ↓
Canonical Source Expansion                 — outside ES-011; resolves body
                                              content per node type (§I)
    ↓
Tier 2 — Sufficiency (per evidence set)    — §H–§M below
    ├─ Gate A: Relevant Evidence Exists
    ├─ Gate B: No Unresolved Conflict
    └─ Percentage Threshold (≥80% of
       decomposed sub-checks): Coverage,
       Coherence
    ↓
Sufficient Evidence  →  Grounded Context  →  Generation (out of scope here)
Insufficient Evidence →  Insufficient-Evidence outcome (RFC-007 §H/§M state 2)
```

This document owns everything between "Eligible Set" and "Sufficient / Insufficient Evidence." It does not own retrieval (ES-011), canonical content storage (the node tables, unmodified), or generation (not yet specified anywhere).

## C. The Core Distinction: Eligibility vs. Sufficiency

**Eligibility** asks: is this candidate even allowed to be considered as evidence at all? This is answered per candidate, from facts that already exist or can be looked up, independent of what the user actually asked. A candidate can be perfectly eligible and still be completely irrelevant to the question, eligibility says nothing about relevance.

**Sufficiency** asks: taken together, does the eligible evidence actually support answering *this* question? This is answered once, over the full eligible set, and depends on the question's content, not merely on database facts about the candidates.

Conflating these two is the specific failure mode this document is designed to avoid: a candidate with a resolvable title, a published status, and real body content (fully eligible) contributes nothing toward answering a question it has nothing to do with. Eligibility is necessary; it is never sufficient.

## D. Tier 1: Eligibility Criteria — Overview

Three criteria, all mandatory, all evaluated per candidate, all deterministic once their inputs are known. A candidate must pass all three to enter the eligible set. Eligibility criteria are evaluated in the order below because each is progressively more expensive to check (E1 and E2 use data ES-011 already returns; E3 requires the canonical-content-expansion query described in §I).

### E1 — Attribution Integrity

- **Purpose:** Ensure the candidate has a verifiable, resolvable identity in Aristolegion's institutional knowledge before it is treated as evidence of anything.
- **Evidence required:** `RetrievalCandidate.sourceStatus`, `RetrievalCandidate.source` (both already computed by ES-011's `fetchSourceAttribution`).
- **Pass condition:** `sourceStatus === "ok"` and `source !== null`.
- **Fail condition:** `sourceStatus === "unavailable"`.
- **Unknown condition:** None. ES-011 resolves this to one of exactly two values for every candidate it returns; there is no third state at this layer.
- **Tier:** Eligibility, mandatory.
- **Deterministic:** Yes.
- **Requires semantic/LLM judgment:** No.
- **False-positive risk:** None of concern — this is a database-existence fact, not a relevance judgment, so it cannot itself cause an irrelevant answer, only an unattributed one, which it correctly excludes.
- **False-negative risk:** A candidate could be genuinely relevant but administratively unattributable (a transient lookup failure indistinguishable, in the public contract, from a genuinely missing row). This is an accepted trade-off ES-011 already makes for its own callers; this document inherits it rather than compounding it with a new mechanism.

### E2 — Publication State (Publishability)

- **Purpose:** Ensure content is treated as citable public evidence only when its underlying publication status makes that appropriate. **CTO-ratified policy:** public Advisor evidence in v1 must come from published content only; draft or unpublished content is not eligible evidence for the public Advisor. See §N for the ratified policy statement and its rationale.
- **Evidence required:** A `status` field on the candidate's underlying table, where one exists. Verified directly against the schema: `essays`, `publications`, `frameworks`, and `manifesto` each carry a status column (`'draft'`/`'published'` for the first three named types, `'draft'`/`'published'` for manifesto, `'Research Development'`/`'Published'` for frameworks). `concepts`, `topics`, and `principles` carry no status column at all — there is no unpublished variant structurally possible for those three types today.
- **Pass condition:** For node types with a status column, the column equals that type's published value. For node types without one, this criterion is not applicable and passes structurally.
- **Fail condition:** Status column present and not equal to the published value.
- **Unknown condition:** Status column present but null or unreadable. The schema defines these columns `not null` with defaults, so this should not occur in practice; the specification nonetheless defines the treatment: fail-closed (treat as Fail), consistent with the conservative default applied throughout this document.
- **Tier:** Eligibility, mandatory. The policy this criterion enforces — published content only — is ratified for v1 (§N). What remains open is only the mechanical implementation of the check itself (the exact expansion-query shape, how the status column is surfaced), which is **[IMPLEMENTATION-SPEC DECISION]**, not a policy question.
- **Deterministic:** Yes.
- **Requires semantic/LLM judgment:** No.
- **False-positive risk:** None at the mechanical level. The trade-off of excluding all draft content, even content that is complete and reviewed but administratively unpublished, has been considered and accepted for v1 (§N) rather than left as an open risk.
- **False-negative risk:** Legitimate, accurate institutional content sitting in "draft" status for reasons unrelated to reliability is excluded by this policy. This is a named, accepted cost of the v1 published-only rule, not an oversight.

### E3 — Canonical Content Availability

- **Purpose:** Ensure the evidence set is grounded in retrievable text, not merely in identity metadata. ES-011 itself never fetches body content, only `title`/`slug` (or `text`/`slug` for `principle`) — this criterion is what makes the difference visible and enforceable.
- **Evidence required:** The result of a canonical-content-expansion query per node type, executed after eligibility's cheaper checks. Verified field mapping, per node type, directly against the schema and migrations:

  | Node type | Content field | Nullability |
  |---|---|---|
  | essay | `content` (text, markdown) | not null |
  | publication | `content` (jsonb) | **nullable** — populated for only one row as of migration 0006 |
  | framework | `description` (text) + `steps` (jsonb) | `description` not null, `steps` nullable |
  | concept | `summary` (text) | not null |
  | topic | `summary` (text) | not null |
  | manifesto | `sections` (jsonb, structured) | not null |
  | principle | `text` (already present in ES-011's `source` object) | not null |

- **Pass condition:** The relevant content field resolves to a non-null, non-empty value.
- **Fail condition:** The content field is null, empty, or the expansion query finds no matching row.
- **Unknown condition:** An expansion-query call failure (infrastructure/transient) is a structurally different event from a confirmed-empty content field. Both currently resolve to Fail for eligibility purposes — evidence that cannot be confirmed present is not treated as present — but should be logged distinctly for operability, mirroring the exact distinction ES-011's own `fetchSourceAttribution` already draws between a failed lookup call and a successful call with no matching row.
- **Tier:** Eligibility, mandatory. The one eligibility criterion that cannot be evaluated at pure-retrieval time, since it depends on the expansion step described in §I, outside ES-011's boundary.
- **Deterministic:** Yes.
- **Requires semantic/LLM judgment:** No.
- **False-positive risk:** None of concern.
- **False-negative risk:** A row with minimal but technically non-empty content (e.g., a very short `summary`) passes this criterion, since it checks presence, not adequacy. Adequacy is deliberately not duplicated here — it is addressed by the sufficiency criteria in §K, not by eligibility.

## E. Canonical Source Expansion (Supporting Step, Not a Criterion)

Between eligibility's E1/E2 (retrieval-time data) and E3 (expansion-time data) sits one grouped query per node type present in the eligible-so-far candidate batch, following the exact pattern `fetchSourceAttribution` already uses (group by `nodeType`, one `supabaseSelect` per group with an `id in.(...)` filter), requesting the additional content and status columns identified in E2/E3's tables above. This is a design note for the future implementation, not a new criterion — it is the mechanism E2 and E3 depend on, kept separate from them because it is infrastructure, not judgment.

## F. Criteria Deliberately Excluded From Eligibility

- **Graph corroboration** is not an eligibility criterion. The production graph is sparse — RFC-006 §U records 30 nodes and 13 edges at time of writing. Requiring or weighting graph connectivity would reject legitimate single-node evidence that simply has no edges yet, a severe false-negative risk with no offsetting benefit at this graph density. `relationshipContext` remains part of the conceptual Evidence object (§P) for observability and future re-evaluation, but plays no role in eligibility or sufficiency in this specification.
- **Source-type diversity** (requiring candidates to span multiple node types) is not a criterion anywhere in this document. No repository evidence exists that heterogeneous node types correlate with answer reliability, and imposing this requirement would penalize legitimate cases where several rows of the same type (e.g., three related concepts) are the correct and complete evidence for a question.

## G. Tier 2: Sufficiency — Overview and the Departure From a Flat Percentage

The brief for this document proposed a two-layer model: mandatory eligibility, then "the eligible evidence set must satisfy at least 80% of the defined sufficiency criteria." Analyzing that literally against the criteria this document actually defines below (semantic relevance, question coverage, source coherence, conflict status) surfaces a problem worth stating plainly rather than working around silently: **relevance-existence and conflict-freedom are not gradable in the same sense coverage and coherence are.** An evidence set with zero relevant candidates has nothing left for coverage or coherence to be evaluated against; a set containing a live, unresolved contradiction on the specific claim at issue should not be rescued by two unrelated criteria happening to pass. Treating all four as equally-weighted items in one percentage would let a serious defect be "outvoted."

This document therefore refines the two-layer proposal into two kinds of sufficiency checks, both still inside Tier 2, still evaluated only after eligibility (Tier 1):

- **Mandatory sufficiency gates** (binary, not part of the percentage): is there any relevant evidence at all, and is that evidence free of unresolved direct contradiction.
- **Percentage-threshold criteria** (the ≥80% mechanism, applied only to what remains after the gates pass): question coverage and source coherence.

This is presented as this document's answer to "does the two-layer design produce a coherent and auditable policy" — the answer is: the eligibility/sufficiency split is sound, but sufficiency itself needs an internal gate/percentage split to avoid a genuinely defective evidence set being averaged past.

## H. Sufficiency Gate A — Relevant Evidence Exists (Semantic Relevance)

- **Purpose:** Establish that at least one eligible candidate is substantively about what the user asked, not merely lexically or embedding-adjacent to it. This is the mechanism that addresses vocabulary collision — see §J for why this cannot be established by attribution or distance alone.
- **Architectural boundary:** Gate A asks "are we in the right institutional territory?" — whether the eligible set contains anything substantively on-topic at all. It does not ask "do we have enough evidence to answer every part of the question?" That second question is Question Coverage's (§K.5), not this gate's. Gate A can pass on the strength of a single substantively relevant candidate even when large parts of a multi-part question remain unaddressed — whether that matters is decided downstream, not here.
- **Evidence required:** A per-candidate relevance judgment against each eligible candidate's expanded content (§I) and the question text.
- **Pass condition:** At least one eligible candidate is judged to substantively address the question's actual subject matter.
- **Fail condition:** Zero eligible candidates are judged substantively relevant — all overlap with the question is incidental (shared vocabulary, adjacent phrasing, coincidental embedding proximity).
- **Unknown condition:** The relevance-judgment mechanism itself fails to render a judgment (timeout, error). Fail-closed: treated as Fail for this gate. **[IMPLEMENTATION-SPEC DECISION]** — whether a mechanism failure should instead route to a distinct system-level outcome, rather than silently resolving to "insufficient evidence," is not decided here; it depends on a mechanism this document does not design.
- **Tier:** Sufficiency, mandatory gate — not part of the percentage threshold. Reclassified out of a percentage item deliberately (see §G): an empty relevant set makes every downstream check moot, so it must be a gate, not one vote among several.
- **Deterministic:** No.
- **Requires semantic/LLM judgment:** Yes. **[IMPLEMENTATION-SPEC DECISION]** — the exact evaluation mechanism (a dedicated lightweight judgment step, a property of the generation call itself, or something else) is not specified here, matching RFC-007's own discipline of fixing the requirement without inventing the mechanism.
- **Known false-positive risk:** A judgment mechanism that is itself susceptible to the same vocabulary-collision failure it exists to catch (for example, a naive keyword-overlap check) would defeat the purpose of this gate entirely. The mechanism's own reliability is critical and is explicitly out of this document's scope to guarantee.
- **Known false-negative risk:** An overly strict relevance judgment could reject genuinely relevant but obliquely phrased institutional questions — the "indirect institutional" category in the evaluation plan (§T) exists specifically to surface this failure mode.

## I. Sufficiency Gate B — No Unresolved Conflict

- **Purpose:** Prevent generation from proceeding when the relevant evidence set contains a direct, unresolved contradiction on the specific claim at issue. Presenting one generated answer grounded in mutually contradictory institutional sources manufactures false certainty, which is precisely what RFC-007 §D prohibits ("must never manufacture institutional claims").
- **Evidence required:** The relevant subset produced by Gate A (conflict is only meaningful to assess among candidates already judged relevant to the same question).
- **Pass condition:** No pair of relevant sources makes directly opposing claims about the same specific point the question turns on.
- **Fail condition:** At least one such direct, unresolved contradiction is identified.
- **Unknown condition:** The conflict-detection mechanism cannot determine whether a contradiction exists. Per the instruction to prefer the most conservative defensible behavior for conflicting evidence, this document defines an inability to determine conflict status as fail-closed for this gate: an unresolvable ambiguity is treated the same as a detected conflict, not the same as a confirmed absence of one.
- **Tier:** Sufficiency, mandatory gate — not part of the percentage threshold, for the same reason as Gate A: a live contradiction should not be outvoted by unrelated passing checks.
- **Deterministic:** No.
- **Requires semantic/LLM judgment:** Yes. Mechanism not specified here — **[IMPLEMENTATION-SPEC DECISION]**.
- **Known false-positive risk:** Two sources addressing the same topic from different angles or depths could be misclassified as "contradictory" when they are merely complementary — this overlaps conceptually with the Source Coherence criterion below (§K), and the boundary between "direct contradiction" (this gate) and "incoherent but not contradictory" (a softer percentage-tier concern) is a genuine design tension this document does not fully resolve. It is named here rather than papered over.
- **Known false-negative risk:** A narrowly scoped contradiction check (looking only for explicit, direct opposing statements) will miss subtler tensions between sources — those are intentionally left to the softer Source Coherence criterion (§K) rather than this gate, to avoid a single mechanism trying to do both jobs.
- **Conceptual boundary (Gate B vs. Source Coherence), made explicit:** Gate B asks a narrow question — is there a direct, unresolved contradiction on the specific claim the user is asking about? Source Coherence (§K.6) asks a broader, softer question — do the relevant sources, taken together, generally support a coherent answer without undermining one another? A difference in emphasis, an incomplete alignment, or mild incoherence between sources is not, by itself, a Gate B failure; it belongs to Source Coherence. Where genuine uncertainty remains about which of the two applies, this document's conservative default is to fail at the gate rather than invent a doctrine to resolve the ambiguity. That default is not license to treat every difference in framing as contradiction: two sources emphasizing different aspects of the same institutional position, or addressing a question at different depths, are not in conflict merely because they are not identical. A live, unresolved contradiction is never "outvoted" by passing percentage-tier checks — it fails sufficiency outright, at the gate, before the percentage math in §K is even computed.

## J. Vocabulary Collision: Why Attribution Is Not Relevance

Attribution (E1) and content availability (E3) together establish only that a database row with a given title and slug exists, is publishable, and has retrievable text whose embedding happened to be among the nearest to the query's embedding. None of that establishes that the row is actually about what the user meant to ask.

To state this plainly: a source can be attributable (E1), published (E2), and content-bearing (E3), and still be irrelevant to what the user actually asked. Attribution is not relevance. Distance is not substantive relevance. Passing every eligibility criterion establishes only that a candidate is a legitimate, citable piece of Aristolegion's institutional record — it establishes nothing about whether that record has anything to do with the question at hand.

Concretely: a question phrased around the ordinary meaning of "judgment," "wisdom," "leadership," or "capability" (asking, for instance, about a personal decision, unrelated to Aristolegion) can retrieve an Aristolegion essay or principle discussing "Philosophy of Judgment" or "The Capability Dividend," purely because both texts share vocabulary in the same embedding neighborhood. `match_node_embeddings` has no floor and no concept of "unrelated" — confirmed directly against its SQL definition (migration `0010`), it always returns its `match_count` nearest rows, however far "nearest" actually is. Attribution guarantees the retrieved row is correctly identified; it says nothing about whether the row's content addresses the user's actual question.

Gate A (§H) exists specifically to prevent vocabulary collision of this kind from moving directly into generation — it is the one place in this contract where relevance, as opposed to identity or availability, is actually checked. This document does not attempt to solve the problem with a cosine-distance cutoff: no validated cutoff exists (the retained evidence for one does not exist, per the prior repository inspection), and a fixed number would not distinguish "these two texts share vocabulary" from "these two texts share a subject" in any case — that distinction requires reading the content, not measuring its distance from the query.

## K. Sufficiency Percentage — Question Coverage and Source Coherence

Applied only to evidence sets that have already passed Gate A and Gate B (§H, §I). What follows is an **80% evidence-criteria satisfaction threshold** — an operational acceptance rule applied to discrete pass/fail checks. It is not a probability, not an empirical confidence score, not a validated statistical threshold, and not a cosine-similarity threshold. See §K.2 for the precise framing this document requires when describing it.

### K.1 — What the Percentage Applies To

The percentage is not computed over a fixed count of named criteria. It is computed over the atomic sub-checks those criteria decompose into for the specific question and relevant evidence set at hand:

- **Question Coverage** decomposes into the material facets identified in the question. Facet count is determined per question, not fixed by this document — a future implementation spec defines the facet-identification mechanism.
- **Source Coherence** (applicable only when the relevant subset has two or more members) decomposes into pairwise coherence checks across every pair of relevant sources.

### K.2 — The Threshold

At least 80% of the applicable atomic sub-checks, across both decomposed criteria combined, must pass, using ceiling rounding (the required-pass count rounds up), consistent with the conservative default applied throughout this document.

**This threshold must not be described, implemented, or reasoned about as a probability or a confidence measure.** Passing it means the evidence set satisfied 80% or more of the applicable, discretely-defined checks in §K.1 — nothing more. It does not mean the resulting answer is "80% likely to be correct," it does not correspond to any measured cosine-similarity value, and it is not a statistically validated figure. It is an 80% evidence-criteria satisfaction threshold: an operational acceptance rule over binary pass/fail sub-checks, adopted as policy, not derived from data.

### K.3 — Granularity

Per evidence set, per question. In v1's single-turn model (RFC-007 §O) these are equivalent, since exactly one evidence set exists per question. This equivalence would need re-examination if multi-turn interaction is ever introduced (RFC-007 §P) — not addressed here, per that same deferral.

### K.4 — Unknown/Unavailable Sub-Checks

Excluded from both numerator and denominator. A sub-check that cannot be evaluated does not count for or against sufficiency, consistent with how the eligibility criteria treat inapplicability (E2's not-applicable-passes-structurally treatment for status-less node types is the same pattern).

### K.5 — Question Coverage, Specified

- **Purpose:** Ensure the relevant evidence, taken as a whole, addresses the material scope of the question, not only one facet of a multi-part question.
- **Pass condition (per facet):** The facet is addressed by at least one relevant, eligible piece of evidence.
- **Fail condition (per facet):** No relevant evidence addresses it.
- **Overall:** ≥80% of identified facets (ceiling-rounded) must individually pass. For a single-facet question — the common case for a narrow, single-canonical-source question — this reduces to requiring that one facet be covered in full (see §L).
- **Requires semantic/LLM judgment:** Yes. Facet identification and per-facet coverage judgment are both **[IMPLEMENTATION-SPEC DECISION]**.
- **Known false-positive risk:** A shallow coverage judgment could accept an evidence set that touches every facet superficially without depth on any of them.
- **Known false-negative risk:** An overly strict judgment could treat a rhetorical sub-clause or tangential phrase as its own "material facet," penalizing legitimately narrow questions that have exactly one real subject.

### K.6 — Source Coherence, Specified

- **Purpose:** When more than one relevant source is present, ensure they support a broadly consistent picture rather than talking past each other, distinct from the direct-contradiction case Gate B already excludes outright.
- **Applicability:** Only when the relevant subset has two or more members; otherwise not applicable, excluded from the denominator entirely (see §L for the single-source case).
- **Pass condition (per pair):** The two sources, read together, do not present materially inconsistent framings of the same specific point, and are not judged to fall short of outright contradiction while still undermining confidence that they jointly support one answer.
- **Fail condition (per pair):** They do.
- **Overall:** ≥80% of pairs (ceiling-rounded) must pass.
- **Requires semantic/LLM judgment:** Yes. Mechanism not specified — **[IMPLEMENTATION-SPEC DECISION]**.
- **Known false-positive/negative risk:** As noted in §I, this criterion's boundary with Gate B's contradiction check is not crisp. A mechanism could double-count a real contradiction as mere incoherence, or under-detect a subtle inconsistency it should have caught. This tension is named, not resolved, here.

### K.7 — Excluded From the Percentage Tier: "Evidentiary Adequacy"

The originally proposed criterion "evidentiary adequacy" (does the evidence contain enough substantive content to ground an answer) is not adopted as a separate item. It is subsumed by Question Coverage and by Gate A's relevance requirement together: a candidate that is relevant but only mentions the topic in passing will already tend to fail a properly specified facet-coverage check, and adding a distinct "adequacy" criterion would double-count the same underlying concern under a different name, inflating the denominator without adding a genuinely independent signal.

### K.8 — Honest Assessment of the 80% Figure at Current Scale

Given the corpus's current size — 30 nodes, 13 edges, per RFC-006 §U — most questions will decompose into few facets and small relevant subsets (often exactly one). At small denominators, an 80% threshold under ceiling rounding is frequently indistinguishable from 100%: 80% of 1 requires 1; 80% of 2 requires 2. Meaningful tolerance for a single failing sub-check only appears once a question decomposes into five or more atomic sub-checks. This is an accurate consequence of applying a percentage policy to a small evidence base, not a defect in how this document has formalized it — but it should be understood plainly by whoever ratifies this specification: **at today's scale, "80% sufficiency" and "must satisfy every applicable check" will often produce the same result.** The percentage framing becomes materially more meaningful, and distinct from a strict AND, as the corpus and typical per-question facet/source counts grow. This is flagged explicitly in §V for CTO awareness. The 80% figure is ratified as policy for v1 (§V), not as a scientifically validated value — this mechanism requires the empirical evaluation described in §T before 80%, or its behavior at small N, is treated as validated rather than as a starting hypothesis.

## L. Single-Source Sufficiency

A single authoritative source can fully satisfy this specification. Explicitly worked through: with a relevant subset of size one, Gate A passes trivially (that one source is relevant), Gate B passes trivially (a contradiction requires at least two sources to contradict each other), Source Coherence is not applicable (excluded from the denominator, §K.6), and only Question Coverage applies. If the question is genuinely single-faceted — which a single source fully answering it well implies — Coverage requires only that one facet be addressed, which the source does. Nothing in this specification requires a second source merely because multiple sources sound more reassuring. A single source is only insufficient when it fails to cover a question that genuinely has multiple material facets, which is a coverage failure, not a single-source penalty.

## M. Conflicting Evidence — Policy

Handled entirely by Gate B (§I): an unresolved direct contradiction between eligible, relevant sources fails sufficiency outright, before the percentage threshold is even computed. This document does not invent institutional doctrine to resolve such a conflict, and does not permit a conflicted evidence set to "pass with a constraint" (for instance, generating an answer that flags the disagreement to the user). That is a plausible future direction, but it is a distinct product decision with its own UX and trust implications, not something this specification grants by default. The conservative default is: unresolved conflict is insufficient evidence, full stop, until a separate, explicit decision says otherwise.

## N. Publication State — Ratified Policy for v1

Why this matters: the embedding-reconciliation worker (`app/api/internal/embeddings/reconcile/route.ts`) selects from `essays` and `publications` with no status filter, confirmed directly in code — every row, draft or published, is embedded and therefore retrievable. Nothing in ES-011's `RetrievalCandidate` or `Source` types carries a status field today. A draft essay is, mechanically, exactly as retrievable as a published one. Treating unreviewed or intentionally unpublished institutional content as citable evidence on a public, anonymous surface carries a real risk: it could surface material the institution has not chosen to make public, attributed with the same confidence as anything else in the corpus.

**CTO-ratified policy:** public Advisor evidence in v1 uses published content only. Draft or unpublished content, for any node type that carries a publication-state field, is not eligible evidence for the public Advisor, without exception, in v1. This is now a decided policy, not an open question — E2 (§D) is the eligibility criterion that enforces it.

What remains unresolved is mechanical, not policy: the exact expansion-query shape that surfaces the status column per node type, and any related implementation detail, is **[IMPLEMENTATION-SPEC DECISION]**, left to a future implementation specification rather than fixed here. Revisiting the published-only policy itself — for instance, whether a later version might allow disclosed draft content under some condition — would require a separate, explicit decision; it is not left ambiguous for v1.

## O. Non-Institutional Questions — Explicit Boundary

RFC-007 §G marks Advisor's behavior toward questions outside Aristolegion's institutional domain as `[OPEN]`, by design, "to prevent this document from silently deciding Advisor is a general-purpose chatbot." This specification does not resolve that question and does not attempt to.

What this specification does define: a non-institutional question will, in the overwhelming majority of cases, simply fail Gate A (§H) — no eligible candidate will be judged substantively relevant, because there is no institutional content substantively relevant to it — and will therefore resolve to the **insufficient institutional evidence** outcome through the ordinary operation of this contract, not through any special-cased detection of "this looks non-institutional."

What happens *after* that outcome is reached — a hard refusal, an explanation that the question falls outside Aristolegion's institutional knowledge, a redirect toward institutional topics, or something else — is precisely the RFC-007 §G policy question, and remains entirely unresolved by this document. This document supplies the mechanism that produces the insufficient-evidence signal; it does not supply the response policy that acts on it.

## P. Conceptual Evidence Object

Not code — the fields a future implementation should conceptually carry, per candidate, grouped explicitly by what kind of information each one is, so raw signals are never confused with judgments made about them:

**Raw retrieval signals** (from ES-011, unmodified, carried through for identity and observability):
- Node identifier (node type + node id, mirroring ES-011's own addressing)
- Node type
- Title or text (per ES-011's existing discriminated `Source` shape)
- Slug
- Retrieval distance (raw, carried through for observability; never used as a gate or threshold in this specification)
- Rank position
- Relationship context (carried through for observability only, per §F; plays no role in eligibility or sufficiency)

**Canonical content (from the expansion step, §E, outside ES-011's boundary):**
- Canonical source content
- Publication state, where applicable to the node type; otherwise not applicable

**Eligibility status** (Tier 1, §D — deterministic, computed independent of the question):
- Per-criterion result: pass/fail for E1, E2, E3
- Overall eligible/ineligible flag

**Relevance judgment** (Gate A, §H — semantic, computed against this specific question):
- Relevant / not relevant / unknown
- Membership in the relevant subset (derived)

**Final per-candidate status:**
- eligible-and-relevant, eligible-but-not-relevant, or ineligible (with which criterion failed)

And, at the evidence-set level, per question, grouped the same way:

**Relevance and conflict gate results:**
- The relevant subset (the list of Evidence objects marked eligible-and-relevant)
- Gate A result (pass/fail) and Gate B result (pass/fail)

**Sufficiency sub-checks** (percentage tier, §K — only computed if Gate A and Gate B both passed):
- Applicable percentage-tier sub-checks and their individual pass/fail results (per facet, per source-pair)
- Sub-check counts: applicable total, passed, required-to-pass

**Final sufficiency result:**
- Final sufficiency outcome: sufficient / insufficient
- A diagnostic rationale sufficient to reconstruct *why* the outcome was reached (which gate failed, or which sub-checks failed), for the evaluation use described in §T

## Q. Outcome States

This document defines the meaning of two of the four outcome states RFC-007 §M already establishes; it introduces no new states.

- **Sufficient evidence:** the eligible set survives Gate A, Gate B, and the ≥80% percentage threshold on the applicable Question Coverage / Source Coherence sub-checks. Generation is permitted to proceed (§R).
- **Insufficient evidence:** any of the above fails — an empty relevant subset, an unresolved conflict, or a percentage shortfall. This is, per RFC-007 §H, a valid semantic outcome, not a system failure.

Explicitly out of this document's scope, unchanged from RFC-007 §M:

- **Retrieval failure** — `retrieve()` itself returning `{ok: false, ...}` — occurs upstream of everything this document defines. If retrieval fails, there is no candidate set to evaluate eligibility or sufficiency over at all.
- **Generation failure** — occurs downstream, only reachable after this document's contract has already returned "sufficient evidence."

## R. Grounding Requirement

Generation may use only Evidence objects that are eligible, are members of the relevant subset, and belong to an evidence set that reached the "sufficient evidence" outcome. When evidence is judged insufficient, generation must not run at all, and in particular must not be used to "fill the gap" from the underlying model's own general knowledge merely because retrieved institutional evidence was thin. Thin evidence that fails this contract routes to the insufficient-evidence outcome; it does not route to a best-effort answer drawing on non-institutional knowledge. This restates, mechanically, RFC-007 §G and §B's own framing: Advisor is a grounded interface to Aristolegion's institutional knowledge, not a general-purpose model with citations attached when convenient.

This contract is a gate on whether generation is *permitted to be attempted*. It is not a guarantee that everything generated afterward is factually perfect. RFC-007 §D already frames Advisor's role as interpretation, not manufacture, of retrieved evidence, this document does not strengthen or alter that framing, it only decides when interpretation is allowed to begin.

## S. Observability and Auditability

Every evidence-set evaluation should be reconstructable after the fact: which gate (if any) failed, which percentage sub-checks passed or failed, and the resulting outcome. This is required for the evaluation work in §T to be able to explain *why* a question passed or failed, not only *that* it did.

Consistent with RFC-007 §N's hard requirement, none of this implies logging raw question text by default. The diagnostic rationale in the Evidence Set object (§P) is structural — which named gate or sub-check failed — not a transcript of the question or the retrieved content. Separately, the existing `next.config.ts` `removeConsole` configuration strips `console.log`/`warn`/`info`/`debug` from production builds, keeping only `console.error` — confirmed directly in that file. Any future implementation of this contract's observability needs to account for that, either by using `console.error` for anything that must survive to production or by treating this as its own open infrastructure question. Not resolved here.

## T. Evaluation Plan

No evaluation artifact of any kind is committed to this repository as of this document, confirmed by a full-tree search. The previously described 40-question exploratory evaluation, whatever it found, does not exist here in a form this document can inspect, and this document does not claim it validates 80%, the gate/percentage split, or any other number defined above. **The 80% evidence-criteria satisfaction threshold is a hypothesis requiring empirical validation, not a validated result.** All of the above is a proposed contract awaiting that validation.

Using the five evaluation categories already established (A: clear institutional, B: indirect institutional, C: vocabulary collision, D: clear non-institutional, E: boundary ambiguous), the acceptance questions a real evaluation run needs to answer, measurably, before this contract is trusted in production:

- How many category-A (clearly institutional) questions are incorrectly routed to insufficient evidence, and via which gate or sub-check?
- How many category-C (vocabulary-collision) questions incorrectly reach the sufficient-evidence outcome, i.e., how often does Gate A fail to catch what it exists to catch?
- How many category-D (clearly non-institutional) questions incorrectly reach sufficient evidence?
- How often does this contract's outcome (sufficient/insufficient) disagree with independent human labeling of the same question and retrieved candidates?
- For category-A and category-B questions that resolve via a single relevant source (§L), does the single-source path produce acceptable outcomes, or does it need its own separate review?
- At what typical facet-count and relevant-subset-size does the 80% threshold in practice behave as something other than a strict AND (§K.8), and does that behavior match what was intended when "80%" was agreed in principle?

Each evaluation record needs, at minimum:

- the question text
- the full candidate list with distances and `sourceStatus`
- which eligibility criteria (E1, E2, E3) passed or failed, per candidate
- the Gate A decision and which candidates, if any, were judged relevant
- the Gate B decision and whether any contradiction was identified
- which facets were identified for Question Coverage, and which passed
- which source pairs were evaluated for Source Coherence, and which passed
- whether generation was ultimately allowed to proceed
- the final outcome (sufficient / insufficient)
- independent human labeling of what the outcome should have been

This is enough to reconstruct *why* an outcome was reached, not only *what* the outcome was, matching §S's observability requirement.

## U. Explicit Non-Goals

- Does not modify `lib/retrieval/index.ts`, `lib/retrieval/types.ts`, any Supabase migration or schema, RFC-006, or RFC-007.
- Does not specify the generation provider, model, or prompt construction.
- Does not specify the public HTTP surface, request/response shape, authentication, or rate limiting.
- Does not specify the mechanical implementation of the publication-state check (query shape, any type or migration changes) — the policy itself (published content only, §N) is ratified, but its implementation is [IMPLEMENTATION-SPEC DECISION].
- Does not decide Advisor's behavior toward non-institutional questions (§O).
- Does not invent a cosine-distance threshold, a weighted numeric score, or a classifier disguised as a deterministic rule.
- Does not make graph corroboration or source-type diversity a criterion, given the current graph density and the absence of evidence for the latter (§F).
- Does not authorize any implementation. This is a specification for CTO review, per its status line.

## V. Decisions Requiring CTO Ratification

Status of each item as of this revision, following CTO review:

| # | Decision | Where addressed | Status |
|---|---|---|---|
| 1 | The eligibility/sufficiency architecture — the two-question distinction, three eligibility criteria, and the gate/percentage split within sufficiency | §C, §D, §G | **RATIFIED** |
| 2 | Publication state — public Advisor v1 uses published content only | §N, E2 (§D) | **DECIDED / RATIFIED.** No longer open. Only the mechanical implementation of the check remains [IMPLEMENTATION-SPEC DECISION]. |
| 3 | The decomposition-based 80% operationalization (facets and source-pairs, rather than a flat count of named criteria) | §K, §K.1 | **RATIFIED AS PROPOSED POLICY.** Adopted as the operational acceptance rule for v1. Not a statistical or probabilistic claim — see §K.2. |
| 4 | Whether the 80% figure itself is empirically validated | §K.8, §T | **NOT VALIDATED.** Ratified as policy pending the empirical evaluation described in §T. Must not be represented as a validated statistical threshold. |
| 5 | Ceiling rounding (favoring stricter thresholds) over floor rounding for the percentage tier | §K.2 | **RATIFIED for v1.** Not independently validated; may be revisited after evaluation. |
| 6 | The Gate B / Source Coherence boundary (direct contradiction vs. mere incoherence) | §I, §K.6 | **RATIFIED AS PRINCIPLE** — contradiction fails at the gate, softer incoherence is a percentage-tier concern, and the boundary between them is judged case by case rather than mechanically defined. The exact detection mechanism remains [IMPLEMENTATION-SPEC DECISION]. |
| 7 | Advisor's behavior toward non-institutional questions, after Gate A produces an insufficient-evidence outcome | §O | **[OPEN]** — RFC-007 §G's own item, unchanged, not decided by this document. |
| 8 | The exact semantic/LLM judgment mechanisms for Gate A, Question Coverage, and Source Coherence | §H, §K.5, §K.6 | **[IMPLEMENTATION-SPEC DECISION]**, per RFC-007's own discipline — not prescribed here as LLM, deterministic, embedding-based, or hybrid. |

## W. Summary — What This Document Fixes vs. Leaves Open

**Fixed and ratified:** the eligibility/sufficiency distinction; three deterministic eligibility criteria, including publication state, now decided as published-content-only for v1; two mandatory sufficiency gates (relevant evidence exists, no unresolved conflict) evaluated before any percentage math, with the Gate A/Question-Coverage boundary and the Gate B/Source-Coherence boundary both made explicit; a decomposition-based operationalization of the agreed 80% figure over question-coverage facets and source-coherence pairs, with ceiling rounding, adopted as policy for v1 and explicitly framed as an evidence-criteria satisfaction threshold rather than a probability or statistical measure; the single-source case resolving cleanly to "can be fully sufficient"; conflicting evidence resolving conservatively to insufficient; the conceptual Evidence and Evidence Set objects, with raw signals, eligibility, relevance judgment, and sufficiency sub-checks kept explicitly distinct; and the boundary between this document's two outcome states and RFC-007's other two.

**Left open, explicitly:** non-institutional-question response behavior (RFC-007 §G's own item, unchanged), the exact evaluation mechanisms behind every criterion requiring semantic judgment (all [IMPLEMENTATION-SPEC DECISION]), the mechanical implementation of the publication-state check, and empirical validation of the 80% threshold itself, including the honest observation that it will often behave like a strict AND at the corpus's current scale.

---

This document is a specification draft. It does not authorize implementation of any file, route, or schema change. Proceeding to implementation requires separate, explicit approval, consistent with the same discipline RFC-006 and RFC-007 already apply to themselves.
