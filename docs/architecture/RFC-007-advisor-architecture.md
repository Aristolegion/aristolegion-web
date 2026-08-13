# RFC-007: Advisor Architecture

**Status:** Draft — proposed for CTO review. Not yet approved. **This document does not authorize implementation.** No ES number assigned. No branch, no PR, no code, no migration, no `lib/advisor/*`, no route, no UI exists. Held locally only; not committed to the repository.

Tagging convention used throughout: **[OPEN]** — a real decision this document deliberately leaves unresolved. **[DEFERRED]** — explicitly out of v1 scope, by CTO decision, revisited later. **[IMPLEMENTATION-SPEC DECISION]** — belongs to a future implementation specification, not this architecture. **[UNKNOWN]** — no source (repository, CTO decision, or otherwise) answers this, and none is invented here.

**Revision note (CTO review, four targeted corrections):** (1) §I now explicitly gates citation on `sourceStatus: "ok"` — a candidate with `sourceStatus: "unavailable"` can never be presented as an identified source, and insufficient attributable evidence now routes to the insufficient-institutional-evidence outcome rather than silent unattributed grounding (§H cross-referenced); no new status introduced, Retrieval/ES-011 unchanged. (2) §N/§Q now state plainly that raw user question text is never part of default structural logging — only structural metadata (outcome state, latency, provider status, cost/token data) is observable; no new logging system or retention period invented. (3) §S now says "two primary application responsibilities" rather than "exactly two components," and states explicitly that supporting infrastructure (the provider abstraction, the public transport layer) must not collapse those responsibilities or bypass their defined interfaces. (4) §G adds an explicit **[OPEN]** item: behavior for questions outside Aristolegion's institutional domain is intentionally undecided — not refused, not answered from general knowledge, not redirected — specifically to prevent this document from silently deciding Advisor is a general-purpose chatbot.

## A. Historical / Provenance Note

**RFC-005 remains lost and unrecoverable.** `docs/architecture/RFC-005-advisor-architecture.md` is a documentation stub, not a source document — confirmed, independently, twice in this engagement: once during the original recovery investigation, and again during the Advisor Architecture Discovery phase (full `git log --all` across all branches/tags, zero GitHub issues, PR history yielding nothing beyond the stub's own authoring PR). No original RFC-005 text exists anywhere. Even its exact title is not attested in this repository — it is inferred only from the request that produced the stub.

**RFC-007 is newly authored architecture**, derived entirely from CTO decisions made after the Advisor Architecture Discovery brief was reviewed, built on top of RFC-006 (Retrieval Architecture) and the system ES-006 through ES-011 actually delivered. It is not a reconstruction of RFC-005 and does not claim RFC-005's historical authority. Where anything here happens to resemble what RFC-005 might once have said, that is coincidence of reasonable engineering, not derivation.

**The locked Product Requirements Document's "AI learning assistant" phrase is historical product context only.** `docs/PRD/Aristolegion_PRD_v2.0_LOCKED.pdf`, in its Future Considerations backlog (a list of ~19 items explicitly excluded from MVP, alongside mentorship, job boards, certifications, and similar), names "AI learning assistant" as one excluded future item. That phrase is not RFC-005 content, is not a specification, and does not define Advisor's purpose here. **No historical Advisor architecture has been reconstructed from it or from anything else.**

## B. Purpose

Per CTO decision, Advisor is:

> "A grounded intellectual interface to Aristolegion's institutional knowledge."

Advisor is explicitly **not** redefined as a generic chatbot, and the PRD's "AI learning assistant" phrase is explicitly **not** claimed as its definition (§A). Advisor exists to let a user ask a question and receive a response grounded in Aristolegion's actual published institutional knowledge — essays, publications, frameworks, principles, concepts, topics, manifesto — reached through Retrieval, not in the underlying generation model's general training knowledge.

## C. Scope

**In scope (v1):** a public-facing, single-turn question-answering capability, grounded in Retrieval evidence, with source attribution, and a distinct "insufficient institutional evidence" outcome when grounding is inadequate.

**Explicitly out of scope (v1), by CTO decision:**
- Multi-turn conversation, sessions, message persistence, conversation history, conversation summaries, long-term memory (§O).
- Any modification to Retrieval, RFC-006, or ES-011 (§F).
- Any modification to, or creation of, institutional knowledge — publications, principles, concepts, topics, frameworks, `graph_edges`, `node_embeddings` — as a side effect of answering (§S, §R).
- Any new database schema, including `advisor_responses` (§O).
- Any implementation: code, migration, route, UI, model call, branch, PR, or ES number.

## D. Architectural Position

Advisor sits between the public and Retrieval, and nowhere else. The data flow is one-directional and non-negotiable:

```
Institutional Knowledge (Knowledge Graph / node tables)
        ↓
   Embedding Infrastructure (ES-010)
        ↓
   Retrieval (RFC-006 / ES-011)  — evidence acquisition
        ↓
       Evidence (RetrievalResult)
        ↓
   Advisor  — evidence interpretation + response generation
        ↓
   Interpretation
        ↓
   Grounded Response
```

**This is the critical architectural principle of this document:** Retrieval's job ends at evidence acquisition. Advisor's job is evidence *interpretation* and response *generation* — never evidence *creation*, and never institutional-knowledge *mutation*. Advisor may interpret retrieved evidence into a response; it must never manufacture institutional claims and present them as established Aristolegion doctrine, and it must never write back into the Knowledge Graph, the node tables, `graph_edges`, or `node_embeddings` as a consequence of answering a question (§S elaborates; the itemized prohibition is in §R).

## E. User Interaction Boundary

```
Browser
  ↓
Advisor
  ↓
Retrieval
  ↓
Knowledge Graph / Embeddings
```

Never `Browser → Supabase`. Never `Browser → Retrieval`. These two prohibitions are structural, not just policy: no browser-side Supabase client exists anywhere in this codebase today (confirmed during the Advisor Discovery phase), and Retrieval has no HTTP surface of its own (RFC-006 §L, ES-011 §14) — this document does not add one to Retrieval. Advisor is the **only** new public surface this architecture introduces, and necessarily the first public, model-backed surface this codebase has ever required — every existing public route (Sanctum, newsletter, inner-circle, contact) is a plain CRUD/form endpoint, not an LLM-backed one, so no existing pattern can simply be reused wholesale. **[IMPLEMENTATION-SPEC DECISION]** the exact HTTP surface (Route Handler path, request/response shape) is not designed here.

## F. Advisor → Retrieval Interface

- Advisor's **only** interface into the Knowledge Graph/Embedding Infrastructure is the existing, public `retrieve()` export of `lib/retrieval/index.ts`, called exactly as ES-011 defined it, consuming its `RetrievalResult` (success) or `RetrievalFailure` (failure) return value.
- Advisor must **not** directly call `supabaseSelect`/`supabaseRpc` against `node_embeddings`, `graph_edges`, any of the 7 node tables, or `match_node_embeddings`. Those remain exclusively Retrieval's concern.
- **Retrieval remains fully independent of Advisor.** This document proposes **zero** changes to `lib/retrieval/index.ts`, `lib/retrieval/types.ts`, RFC-006, or ES-011 — the same relationship ES-011 itself has to ES-010 (a new layer consuming an unmodified lower layer, never the reverse). RFC-006 §S already anticipated exactly this: "Advisor will need Retrieval, not the reverse."
- Advisor passes user-provided question text into `retrieve()`'s `queryText` parameter and reads the returned result — nothing more privileged than what `lib/retrieval`'s existing public export already offers to any caller.

## G. Grounding Model

- Advisor must ground its response in `retrieve()`'s evidence for institutional-domain questions — it must not silently answer from the generation model's own general knowledge when Aristolegion-specific evidence is thin or absent.
- "Grounded" means the response is constructed using `RetrievalResult.candidates` (their `source` attribution and, where present, `relationshipContext`) as the evidentiary basis — not added as decoration after an already-formed, ungrounded answer.
- Per the critical architectural principle (§D): Advisor may **interpret** retrieved evidence — synthesize, summarize, connect candidates — but must not **manufacture** institutional claims beyond what the retrieved evidence supports, and must not present its own interpretation as if it were itself established Aristolegion doctrine independent of the cited evidence.
- **[IMPLEMENTATION-SPEC DECISION]** the exact mechanism for constructing a grounded response (prompt structure, how many candidates are used, how source material is presented to the generation model) is not designed here — this document fixes the requirement, not the mechanism.
- **[UNKNOWN / not invented here]** any specific prompt template, ranking logic applied on top of Retrieval's already-fixed ranking, or model-routing logic. None of these exist in any source and none are invented by this document.
- **[OPEN]** behavior for questions **outside** Aristolegion's institutional domain (i.e., questions Retrieval has no evidence for because they aren't about Aristolegion's knowledge at all, not merely because a specific question was under-evidenced) is **intentionally unresolved by this document.** Whether such questions are refused outright, answered from the generation model's general knowledge with a clear disclaimer, redirected back to institutional topics, or handled some other way is **not decided here** — deciding this now would risk silently turning Advisor into a general-purpose chatbot (§B explicitly rejects that framing), which is precisely what this open item exists to prevent by not being resolved prematurely.

## H. Evidence Sufficiency / Insufficient-Evidence Behavior

- Zero or insufficient `RetrievalResult` candidates is a **valid, expected semantic outcome, not a system failure.** Retrieval already treats an empty candidate list as `{ok: true, data: {candidates: []}}` (ES-011 §13) — a successful call that happens to find nothing — and Advisor inherits that same non-error framing.
- When evidence is zero or judged insufficient, Advisor must produce an explicit **"insufficient institutional evidence"** response — distinct from both a generic answer and a system error (§M).
- **What this document fixes:** the responsibility (Advisor, not Retrieval, decides sufficiency) and the boundary (Retrieval's output is the only input to that decision — Advisor doesn't independently re-query anything to make it, per §F).
- **[OPEN]** what counts as "insufficient" — a distance threshold, a minimum candidate count, a qualitative judgment made by the generation step itself, or something else — is not decided here. **No numeric evidence threshold is invented.** No such number exists anywhere in Retrieval or Advisor's source material to derive one from, and RFC-006/ES-011's own "no invented numbers" discipline applies with equal force here.
- Sufficiency is not judged on raw candidate count alone: per §I, only candidates with `sourceStatus: "ok"` can be attributed, so evidence that exists but cannot be attributed does not count toward sufficiency — a query that returns candidates but none with `sourceStatus: "ok"` must resolve to the insufficient-institutional-evidence outcome, not a silently unattributed answer.

## I. Source Attribution

- **Advisor may present a candidate as cited/attributed institutional evidence only when that candidate's `sourceStatus` is `"ok"`.** A candidate with `sourceStatus: "unavailable"` must never be presented as an identified institutional source — this resolves, explicitly, what the prior draft left implicit: attribution is gated on `sourceStatus`, not merely "handled honestly."
- Where `sourceStatus: "ok"`, attribution uses the existing `source` contract exactly as ES-011 defined it: `{nodeType, title, slug}` for the six uniform node types, `{nodeType:"principle", text, slug}` for `principle`.
- **If the remaining attributable evidence (i.e., candidates with `sourceStatus: "ok"`) is insufficient to support the response, Advisor must return the insufficient-institutional-evidence outcome (§H) rather than silently grounding the response in unattributed (`sourceStatus: "unavailable"`) evidence.** Sufficiency (§H) and attributability are therefore linked: evidence that cannot be attributed cannot be treated as sufficient grounding.
- **The requirement frozen here is functional, not formatted:** a user must be able to identify which Aristolegion source material supports the response. **No citation UI format is invented** — no footnote convention, numbered-reference scheme, or specific display treatment is specified.
- No new status is introduced and Retrieval/ES-011 is not modified — this section only states how Advisor must use the existing `sourceStatus` values, already defined by ES-011 exactly as they are.
- **[IMPLEMENTATION-SPEC DECISION]** the exact UI/response-field shape used to carry attribution to the user is not designed here — only that `RetrievalResult.source`, gated on `sourceStatus: "ok"`, is the evidentiary source it must derive from.

## J. Generation Provider Abstraction

- Advisor's generation step must sit behind a **provider abstraction/boundary** — not a hard-coded call to one vendor's API embedded directly in Advisor's core logic.
- `lib/embeddings/provider.ts`'s use of OpenAI for embeddings is **not evidence** that Advisor's generation model must also be OpenAI. Embeddings and generation are different capabilities; this document does not assume they share a provider.
- This architecture calls for **one** generation provider to be used at a time, reached through that abstraction — **not** a multi-provider routing system. Adding multiple providers, or logic to select among them, is not part of this document (that would be inventing model routing, explicitly excluded — see §R). The abstraction exists so a *future* provider change doesn't require restructuring Advisor's core logic — it does not imply multiple providers exist now.
- **[UNKNOWN / not invented here]** which provider, which model, or the exact shape of the abstraction interface. No model name is named anywhere in this document.

## K. Public Exposure and Security

- Advisor is the system's first public-facing, model-backed capability — a genuinely new security posture relative to everything built so far. Retrieval, the Embedding Infrastructure, and the Knowledge Graph remain exactly as they are: `service_role`-only, zero public exposure (RFC-006 §L/§T, ES-011 §14).
- **Public access to Advisor must not imply unrestricted access to the underlying generation model.** Some abuse-prevention mechanism must exist at the Advisor boundary (§L elaborates the cost/abuse dimension specifically); this document establishes that requirement without designing the mechanism.
- **[OPEN]** whether Advisor requires user authentication/identity at all — fully anonymous public Q&A versus some form of session or account gating — is not decided here. Nothing in the approved decisions mandates either. **No authentication implementation is invented.**
- What is structurally guaranteed regardless of that open question: no Supabase or OpenAI (or any provider) credential is ever exposed to the browser — every provider call, at every layer, remains server-side (§E, §F already establish this transitively).

## L. Cost and Abuse Controls

Because Advisor is public-facing and model-backed — unlike Retrieval, which correctly deferred cost controls in ES-011 precisely because it had no public caller — this architecture must **account for**, without numerically fixing:

- **Request limits** — some bound on how often a given caller can invoke Advisor.
- **Abuse protection** — protection against automated/bulk querying aimed at running up cost or extracting the underlying corpus wholesale.
- **Output/token limits** — a bound on generation length/cost per request.
- **Cost observability** — visibility, after the fact, into what Advisor is costing (call volume, token usage) — distinct from ES-010/ES-011's minimal structural logging, which was never built to answer a cost question.

**No exact numeric limit is invented** — no requests-per-minute figure, no token ceiling, no quota. No evidence (traffic patterns, cost budget, expected usage) exists yet for a feature that hasn't shipped, and CTO instruction is explicit that numbers are fixed only where evidence supports them. This is the clearest instance in this document of "requirement fixed, mechanism and magnitude deferred."

## M. Failure States

Advisor must distinguish at least these four states, never collapsed into one generic error:

1. **Retrieval failure** — `retrieve()` itself returns `{ok: false, ...}` (`stage: "validation" | "embedding" | "vector_retrieval"`). A failure of evidence acquisition.
2. **Insufficient institutional evidence** — `retrieve()` succeeds but returns zero or judged-insufficient candidates (§H). **Never represented as a technical failure** — a valid semantic outcome with its own explicit response state.
3. **Generation/model failure** — the generation call (§J) itself fails (timeout, provider error, provider-side rate limit, etc.) — a failure of response generation, distinct from anything Retrieval did.
4. **Successful grounded response** — sufficient evidence retrieved, generation succeeded, response returned with source attribution (§I).

These four states must remain independently distinguishable in whatever contract a future Advisor implementation specification defines — the same discipline ES-011 already applied to Retrieval's own failure classes (§13), one layer up. **[IMPLEMENTATION-SPEC DECISION]** the exact result-shape/type encoding of these four states is not designed here.

## N. Observability

- Advisor inherits the structural-logging convention already established by ES-010/ES-011 — minimal, no raw sensitive content logged by default — as a starting point, extended to cover what's new.
- **Raw user question text must not be logged by default.** This is a hard requirement, not a preference: the question text a user submits to Advisor is arbitrary public input (§Q) and is treated the same way ES-010/ES-011 already treat query content — not part of default structural logging.
- **What is architecturally observable:** structural metadata only — which of the four §M states a request resolved to, latency, generation-provider call status, and the cost/token metadata §L requires. These are metadata *about* a request, not the content of the request itself.
- No new logging system is designed here, and no retention period is invented — the existing `console.log`/`console.error`/`console.warn` convention already used throughout this codebase is presumed sufficient unless a future decision says otherwise, consistent with this repository's "no new tooling unilaterally" precedent (no test framework exists here either). How long any of this metadata persists is **[IMPLEMENTATION-SPEC DECISION]**, not fixed here.

## O. Single-Turn Interaction Model

- Advisor v1 is **single-turn Q&A only**. One question in, one response (grounded or insufficient-evidence) out. No memory of prior questions, within or across requests.
- **No sessions, conversation history, message persistence, conversation summaries, or long-term memory are introduced.** No table is created or assumed, including the historically-named `advisor_responses`. The migration-0003 citation (`advisor_responses (ES-012, Advisor layer)`) proves only that such a table was once *contemplated* as future work — it provides no schema, no column list, no structure, and is not treated as evidence of any intended design.
- **Persistence is explicitly deferred**, not designed around. If any request-scoped state is needed at all in an eventual implementation, it exists only within a single request's lifecycle and is discarded after the response returns — **[IMPLEMENTATION-SPEC DECISION]**, not fixed here.

## P. Future Multi-Turn Compatibility

- Multi-turn conversation is deferred (§O), not foreclosed. This architecture is written so that adding it later does not require re-deriving Advisor's core grounding/attribution/failure-handling model (§G–§M) — those are defined per-question, not per-conversation, and compose forward without contradiction.
- **[UNKNOWN / not designed here]** the likely shape of that future extension — a session/conversation identifier, a message-history table, cross-turn context-window management, conversation summarization strategy. Naming that multi-turn support should remain *possible* is not the same as designing it, and nothing here does the latter.

## Q. Data / Privacy Considerations

- User-submitted question text is, for the first time in this system, arbitrary public input flowing into a paid third-party model call — a materially different privacy posture than ES-010/ES-011 ever handled (those only ever processed Aristolegion's own already-published content).
- This architecture does not mandate storing user questions anywhere (consistent with §O's no-persistence stance). Per §N, **raw question text is not part of default structural logging** — only structural metadata (outcome state, latency, provider status, cost/token data) is architecturally observable by default.
- No new logging system is designed and no retention period is invented anywhere in this document (§N).
- No user account, email, or personal-data collection is part of this architecture. **[OPEN]** if Advisor is ever gated by authentication (§K), the privacy implications of that would need addressing in whatever document makes that decision — not assumed here.

## R. Explicit Non-Goals

- No conversation/session/message persistence in v1 (§O).
- No modification to Retrieval, RFC-006, or ES-011 (§F).
- No direct Advisor access to `node_embeddings`, `graph_edges`, any node table, or `match_node_embeddings`, and no direct Supabase access of any kind (§E, §F).
- **No autonomous institutional-knowledge mutation of any kind.** Advisor v1 must not, as a side effect of answering a question, automatically: create publications; modify principles, concepts, topics, or frameworks; modify `graph_edges`; update `node_embeddings`; or otherwise write institutional knowledge in any form. Advisor only ever reads (via Retrieval) and generates a response; it never writes back.
- No hard-coded generation provider, and no multi-provider routing logic (§J).
- No numeric cost/rate/token limits invented without evidence (§L).
- No citation/attribution UI format invented (§I).
- No authentication implementation invented (§K).
- No database schema invented — including `advisor_responses` (§O).
- No prompt templates, ranking logic beyond Retrieval's own, or memory strategy invented (§G, §P).
- No RFC-005 content reconstructed, inferred, or assumed (§A).
- No ES number assigned by this document — that happens only after this architecture is approved, mirroring RFC-006 → ES-011's own sequencing.
- No implementation of any kind: no code, `lib/advisor/*`, migration, route, UI, model call, branch, PR, or Supabase/Vercel/environment-variable change.

## S. Separation of Retrieval, Reasoning, and Generation

This is the one place this document treats as fully settled, not open:

- **Retrieval = evidence acquisition, only.** RFC-006/ES-011 already guarantee this — Retrieval performs zero reasoning and zero generation (RFC-006 §R, verbatim: "No LLM prompt construction, no response generation, no model call beyond the query embedding itself"). This document changes nothing about that.
- **Advisor = evidence interpretation + response generation, only.** Advisor may reason over and synthesize what Retrieval returns; it must never acquire evidence through any channel other than `retrieve()` (§F), and it must never mutate institutional knowledge (§R) as part of that reasoning.
- The three concerns — acquiring evidence, reasoning over it, generating a response — are architecturally partitioned across **two primary application responsibilities**: Retrieval (evidence acquisition) and Advisor (evidence interpretation + response generation). This document does not blur that partition in either direction: Retrieval never gains reasoning/generation capability, and Advisor never gains direct evidence-acquisition capability outside Retrieval. Supporting infrastructure introduced around these two responsibilities — the generation-provider abstraction (§J) and the public transport layer (§E) — is exactly that: supporting infrastructure. It must not collapse the two responsibilities into each other or bypass the interfaces this document defines (`retrieve()` as the sole Advisor→Retrieval interface, per §F; the provider abstraction as the sole path to generation, per §J).

## T. Future Evolution / Institutional AI Boundary

- This document deliberately scopes Advisor to one well-bounded v1 capability — grounded single-turn Q&A — rather than architecting for a larger eventual system up front, the same discipline RFC-006 applied to Retrieval itself (v1 vector-first, bounded single-hop expansion, explicitly not designed for hypothetical future capability).
- Plausible future directions — multi-turn conversation (§P), broader institutional integration (e.g., surfacing Advisor within the Inner Circle experience — echoing the locked PRD's own framing, historical context only, not a commitment made here), or any move toward Advisor *producing* rather than only *consuming* institutional content — are **not architected, sized, or committed to here**.
- **Any future direction in which Advisor is permitted to write institutional knowledge (a "continuous knowledge-production loop") is explicitly out of scope for v1 and for this document entirely** (§R). Naming that such a direction is conceivable is not the same as authorizing it; that would require its own, separate, explicit CTO decision and architecture revision — exactly as Advisor itself only now has an architecture, after RFC-005's loss and a deliberate, CTO-led rebuild.
- The one durable commitment this document makes for whatever Advisor becomes: the separation in §S holds. Retrieval stays a pure structured-evidence provider; institutional-knowledge mutation, if it is ever permitted at all, would be a different, explicitly-scoped capability, not a silent extension of Advisor's response-generation path.

## U. Decision Traceability

See the full table below (also provided separately as Deliverable B).

---

# Decision-to-Section Traceability Table

| # | CTO decision (summary) | Section(s) |
|---|---|---|
| 1 | Purpose: "grounded intellectual interface"; not a chatbot; PRD phrase is context only | §A, §B |
| 2 | Public-facing; Browser→Advisor→Retrieval→KG/Embeddings; Retrieval stays internal; security/abuse/cost accounted for | §D, §E, §K, §L |
| 3 | Advisor consumes only `retrieve()`; no direct DB/RPC access; no RFC-006/ES-011 changes; Retrieval independent | §F |
| 4 | Grounding mandatory; insufficient/zero evidence is a valid outcome, not a failure; no invented threshold; unattributable evidence does not count toward sufficiency | §G, §H, §I |
| 5 | Source attribution required (functional); gated on `sourceStatus:"ok"`, `"unavailable"` never cited; no citation format frozen; uses `RetrievalResult.source` | §I |
| 6 | Single-turn v1; no sessions/history/persistence/memory/summaries; must not block future multi-turn | §O, §P |
| 7 | Generation provider abstraction required; not assumed to be OpenAI; no multi-provider routing added now | §J |
| 8 | Four distinguishable failure/outcome states; insufficient evidence never a technical failure | §M |
| 9 | Cost controls required (limits, abuse protection, output limits, cost observability); no invented numeric quotas | §L |
| 10 | Security boundary required; no unrestricted LLM access; no full auth system invented unless required | §K |
| 11 | No autonomous institutional-knowledge mutation; future knowledge-production loop out of scope | §D, §R, §T |
| 12 | No `advisor_responses` table created/assumed; migration citation proves contemplation only, not schema; persistence deferred if unneeded | §O, §R |
| Critical principle | Retrieval = evidence acquisition; Advisor = interpretation + generation; no manufactured doctrine | §D, §G, §S |

---

**This document is held locally, not committed to the repository.** No branch, PR, code, `lib/advisor/*`, migration, route, UI, or model call was created in producing it. No ES number is assigned. Proposed number: **RFC-007** (next available in `docs/architecture/`: RFC-002 through RFC-006 exist, RFC-007 does not — confirmed by directory listing, not yet assigned or committed).

Awaiting CTO review before any next step.
