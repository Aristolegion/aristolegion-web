import {
  canonicalizeConcept,
  canonicalizeEssay,
  canonicalizeFramework,
  canonicalizeManifesto,
  canonicalizePublication,
  canonicalizeTopic,
  type NodeType,
} from "@/lib/embeddings/canonicalize";
import type { PublicationSection } from "@/lib/content/types";
import { supabaseSelect } from "@/lib/supabase";
import type { RetrievalCandidate } from "@/lib/retrieval/types";

// ES-012 Implementation Specification §E — canonical source expansion.
//
// This is a CONSTRAINED DUPLICATION of ES-011's private, unexported
// NODE_TABLE_BY_TYPE mapping (lib/retrieval/index.ts), required because
// ES-011 must remain untouched and does not export it. Two invariants
// this duplication depends on, both documented and neither enforced by
// the compiler or a runtime check today:
//   1. This mapping must remain identical to ES-011's for every node
//      type ES-011 supports.
//   2. Any change to ES-011's supported node types must trigger a
//      manual review of this file.
// This is recognized technical debt / synchronization risk (§E), not
// authorization to export or modify anything in lib/retrieval/.
const NODE_TABLE_BY_TYPE: Record<Exclude<NodeType, "principle">, string> = {
  essay: "essays",
  publication: "publications",
  framework: "frameworks",
  concept: "concepts",
  topic: "topics",
  manifesto: "manifesto",
};

// A lightweight consistency check, run once per process at import time —
// the "where practical" lightweight validation the Implementation
// Specification calls for. It cannot verify ES-011's mapping is
// identical (that mapping is private), but it does verify this file's
// own mapping stays in sync with the NodeType union itself, so an
// ES-011 node-type addition that isn't mirrored here fails loudly
// instead of silently.
const EXPECTED_NON_PRINCIPLE_TYPES: Exclude<NodeType, "principle">[] = [
  "essay",
  "publication",
  "framework",
  "concept",
  "topic",
  "manifesto",
];
for (const type of EXPECTED_NON_PRINCIPLE_TYPES) {
  if (!(type in NODE_TABLE_BY_TYPE)) {
    throw new Error(
      `lib/advisor/sourceExpansion.ts: NODE_TABLE_BY_TYPE is missing an entry for node type "${type}". ` +
        "This mapping is a documented, manually-maintained copy of ES-011's private mapping (see the comment above) " +
        "and must be reviewed whenever ES-011's supported node types change."
    );
  }
}

interface EssayRow {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  status: string;
}

interface PublicationRow {
  id: string;
  title: string;
  description: string;
  intelligence_brief: string | null;
  central_question: string | null;
  key_insights: Array<{ title: string; description: string }> | null;
  content: PublicationSection[] | null;
  status: string;
}

interface FrameworkRow {
  id: string;
  title: string;
  description: string;
  steps: string[] | null;
  status: string;
}

interface ConceptRow {
  id: string;
  title: string;
  summary: string;
}

interface TopicRow {
  id: string;
  title: string;
  summary: string;
}

interface ManifestoRow {
  id: string;
  title: string;
  sections: PublicationSection[];
  status: string;
}

export interface ExpansionEntry {
  /** The specific, per-type field E3 actually checks — non-null and non-empty means "pass". Null means "fail" or "unknown"; see lookupFailed. */
  eligibilityContentField: string | PublicationSection[] | string[] | null;
  /** The richer, joined text passed to judgment calls and grounded context once E3 has passed — reuses lib/embeddings/canonicalize.ts's existing, tested flattening logic. */
  canonicalContent: string | null;
  /** Raw status column value, where the node type has one; null for concept/topic/principle. */
  publicationStatus: string | null;
  /** True if the grouped lookup call for this candidate's node type failed outright (infrastructure), distinct from a confirmed-absent row. */
  lookupFailed: boolean;
}

function candidateKey(nodeType: string, nodeId: string): string {
  return `${nodeType}:${nodeId}`;
}

function groupIdsByType(candidates: RetrievalCandidate[]): Map<Exclude<NodeType, "principle">, string[]> {
  const grouped = new Map<Exclude<NodeType, "principle">, Set<string>>();
  for (const candidate of candidates) {
    if (candidate.nodeType === "principle") continue; // principles need no expansion query — see module comment below
    const set = grouped.get(candidate.nodeType) ?? new Set<string>();
    set.add(candidate.nodeId);
    grouped.set(candidate.nodeType, set);
  }
  const result = new Map<Exclude<NodeType, "principle">, string[]>();
  for (const [nodeType, ids] of grouped) result.set(nodeType, Array.from(ids));
  return result;
}

function isNonEmptyArray(value: unknown[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Fetches canonical content and publication status for the given E1-passing
 * candidates. Principles are intentionally excluded from the query entirely:
 * ES-011's own Source object already carries a principle's full `text`
 * (per ES-011 §12's discriminated Source union), and principles have no
 * status column, so there is nothing left for this module to fetch for them.
 *
 * One grouped supabaseSelect per node type present in the batch — the same
 * pattern ES-011's own (private) fetchSourceAttribution uses. Because
 * supabaseSelect only ever issues `select=*`, one query returns every
 * column needed for both E2 (status) and E3 (content) in a single round
 * trip; there is no separate query for each.
 *
 * Fix for the source-expansion-infrastructure-failure finding: also
 * returns `totalInfrastructureFailure`, true iff every grouped query that
 * was actually attempted failed outright (a lookup call error, not a
 * legitimately-missing row). This is a stage-level signal — it reflects
 * whether the expansion mechanism itself is down, independent of any
 * individual candidate's outcome. A single failed group among several
 * successful ones does NOT set this flag; the affected candidates simply
 * carry `lookupFailed: true` individually (E3 resolves "unknown" for
 * them, per §D), which is the preserved partial-failure behavior. Note
 * this is computed purely from the expansion stage's own group-level
 * success/failure and does not consider whether `principle` candidates
 * (which need no expansion at all) happen to also be present — a total
 * failure of every attempted query is a real infrastructure problem
 * regardless of what other, expansion-independent evidence exists.
 */
export interface ExpansionOutcome {
  entries: Map<string, ExpansionEntry>;
  totalInfrastructureFailure: boolean;
}

export async function expandCanonicalSources(candidates: RetrievalCandidate[]): Promise<ExpansionOutcome> {
  const entries = new Map<string, ExpansionEntry>();
  const grouped = groupIdsByType(candidates);
  let failedGroupCount = 0;

  for (const [nodeType, nodeIds] of grouped) {
    const table = NODE_TABLE_BY_TYPE[nodeType];
    const idList = `in.(${nodeIds.join(",")})`;

    if (nodeType === "essay") {
      const result = await supabaseSelect<EssayRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        console.error("[advisor] source expansion lookup call failed", { nodeType, status: result.status });
        failedGroupCount += 1;
        for (const nodeId of nodeIds) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: true,
          });
        }
        continue;
      }
      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: false,
          });
          continue;
        }
        entries.set(candidateKey(nodeType, nodeId), {
          eligibilityContentField: row.content,
          canonicalContent: canonicalizeEssay(row),
          publicationStatus: row.status,
          lookupFailed: false,
        });
      }
    } else if (nodeType === "publication") {
      const result = await supabaseSelect<PublicationRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        console.error("[advisor] source expansion lookup call failed", { nodeType, status: result.status });
        failedGroupCount += 1;
        for (const nodeId of nodeIds) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: true,
          });
        }
        continue;
      }
      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: false,
          });
          continue;
        }
        // E3 checks `content` specifically, not whether canonicalizePublication's
        // joined output is non-empty — description/intelligence_brief/etc. are
        // non-null even when content itself is null (true for every row but one,
        // per migration 0006), and using the joined text for eligibility would
        // silently accept publications with no real body content at all.
        entries.set(candidateKey(nodeType, nodeId), {
          eligibilityContentField: row.content,
          canonicalContent: canonicalizePublication(row),
          publicationStatus: row.status,
          lookupFailed: false,
        });
      }
    } else if (nodeType === "framework") {
      const result = await supabaseSelect<FrameworkRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        console.error("[advisor] source expansion lookup call failed", { nodeType, status: result.status });
        failedGroupCount += 1;
        for (const nodeId of nodeIds) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: true,
          });
        }
        continue;
      }
      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: false,
          });
          continue;
        }
        entries.set(candidateKey(nodeType, nodeId), {
          eligibilityContentField: row.description,
          canonicalContent: canonicalizeFramework(row),
          publicationStatus: row.status,
          lookupFailed: false,
        });
      }
    } else if (nodeType === "concept") {
      const result = await supabaseSelect<ConceptRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        console.error("[advisor] source expansion lookup call failed", { nodeType, status: result.status });
        failedGroupCount += 1;
        for (const nodeId of nodeIds) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: true,
          });
        }
        continue;
      }
      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: false,
          });
          continue;
        }
        entries.set(candidateKey(nodeType, nodeId), {
          eligibilityContentField: row.summary,
          canonicalContent: canonicalizeConcept(row),
          publicationStatus: null, // no status column — E2 is not_applicable for concepts
          lookupFailed: false,
        });
      }
    } else if (nodeType === "topic") {
      const result = await supabaseSelect<TopicRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        console.error("[advisor] source expansion lookup call failed", { nodeType, status: result.status });
        failedGroupCount += 1;
        for (const nodeId of nodeIds) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: true,
          });
        }
        continue;
      }
      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: false,
          });
          continue;
        }
        entries.set(candidateKey(nodeType, nodeId), {
          eligibilityContentField: row.summary,
          canonicalContent: canonicalizeTopic(row),
          publicationStatus: null, // no status column — E2 is not_applicable for topics
          lookupFailed: false,
        });
      }
    } else if (nodeType === "manifesto") {
      const result = await supabaseSelect<ManifestoRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        console.error("[advisor] source expansion lookup call failed", { nodeType, status: result.status });
        failedGroupCount += 1;
        for (const nodeId of nodeIds) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: true,
          });
        }
        continue;
      }
      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          entries.set(candidateKey(nodeType, nodeId), {
            eligibilityContentField: null,
            canonicalContent: null,
            publicationStatus: null,
            lookupFailed: false,
          });
          continue;
        }
        entries.set(candidateKey(nodeType, nodeId), {
          eligibilityContentField: row.sections,
          canonicalContent: canonicalizeManifesto(row),
          publicationStatus: row.status,
          lookupFailed: false,
        });
      }
    }
  }

  return { entries, totalInfrastructureFailure: grouped.size > 0 && failedGroupCount === grouped.size };
}

/** Whether the type-specific eligibility content field (§E's table) counts as present. */
export function hasEligibilityContent(field: string | PublicationSection[] | string[] | null): boolean {
  if (field === null) return false;
  if (typeof field === "string") return field.trim().length > 0;
  return isNonEmptyArray(field);
}
