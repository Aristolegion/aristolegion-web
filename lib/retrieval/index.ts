import type { NodeType } from "@/lib/embeddings/canonicalize";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, generateEmbedding } from "@/lib/embeddings/provider";
import { supabaseRpc, supabaseSelect } from "@/lib/supabase";
import type {
  PrincipleSource,
  RelationshipContextEntry,
  RetrievalCandidate,
  RetrievalOptions,
  RetrievalOutcome,
  RetrievalResult,
  Source,
  TitledSource,
} from "@/lib/retrieval/types";

// ES-011: Retrieval Service. Implements RFC-006's Retrieval
// Architecture and the frozen ES-011 Engineering Specification: query
// embedding (reusing ES-010's provider unchanged) -> match_node_embeddings
// (unchanged) -> bounded single-hop graph expansion -> source
// attribution -> a structured, model-agnostic result. No LLM call, no
// public exposure, no retry, no caching, no pagination, no rate
// limiting. Server-only — never import this from a "use client"
// component (see lib/supabase.ts's own service-role-key warning).

const DEFAULT_MATCH_COUNT = 10; // matches match_node_embeddings' own SQL default (migration 0010)

// ES-011 §10 — explicit NodeType -> table name mapping, required
// because table names are not derivable by pluralization: `manifesto`
// has no plural table (0007_promote_manifesto.sql), and `principle`
// pluralizes irregularly to `principles`.
const NODE_TABLE_BY_TYPE: Record<NodeType, string> = {
  essay: "essays",
  publication: "publications",
  framework: "frameworks",
  concept: "concepts",
  topic: "topics",
  manifesto: "manifesto",
  principle: "principles",
};

interface MatchNodeEmbeddingRow {
  node_type: NodeType;
  node_id: string;
  chunk_index: number;
  distance: number;
}

interface GraphEdgeRow {
  source_type: NodeType;
  source_id: string;
  target_type: NodeType;
  target_id: string;
  relationship_type: string;
}

interface TitledSourceRow {
  id: string;
  title: string;
  slug: string;
}

interface PrincipleSourceRow {
  id: string;
  text: string;
  slug: string;
}

interface BaseCandidate {
  rank: number;
  nodeType: NodeType;
  nodeId: string;
  distance: number;
}

function candidateKey(nodeType: string, nodeId: string): string {
  return `${nodeType}:${nodeId}`;
}

function groupNodeIdsByType(candidates: BaseCandidate[]): Map<NodeType, string[]> {
  const grouped = new Map<NodeType, Set<string>>();
  for (const candidate of candidates) {
    const set = grouped.get(candidate.nodeType) ?? new Set<string>();
    set.add(candidate.nodeId);
    grouped.set(candidate.nodeType, set);
  }
  const result = new Map<NodeType, string[]>();
  for (const [nodeType, ids] of grouped) {
    result.set(nodeType, Array.from(ids));
  }
  return result;
}

// ES-011 §7 — one grouped supabaseSelect per distinct node_type among
// candidates, for each of the two directions. A group's failure marks
// every candidate of that node_type "unavailable" rather than
// silently returning an empty relationshipContext — an empty array
// must always mean "queried successfully, zero edges," never "not
// queried."
async function fetchRelationshipContext(candidates: BaseCandidate[]): Promise<{
  contextByCandidate: Map<string, RelationshipContextEntry[]>;
  unavailableNodeTypes: Set<NodeType>;
}> {
  const contextByCandidate = new Map<string, RelationshipContextEntry[]>();
  const unavailableNodeTypes = new Set<NodeType>();
  const grouped = groupNodeIdsByType(candidates);

  for (const [nodeType, nodeIds] of grouped) {
    for (const nodeId of nodeIds) {
      contextByCandidate.set(candidateKey(nodeType, nodeId), []);
    }

    const idList = `in.(${nodeIds.join(",")})`;

    const [sourceSideResult, targetSideResult] = await Promise.all([
      supabaseSelect<GraphEdgeRow>("graph_edges", {
        filter: { source_type: `eq.${nodeType}`, source_id: idList },
      }),
      supabaseSelect<GraphEdgeRow>("graph_edges", {
        filter: { target_type: `eq.${nodeType}`, target_id: idList },
      }),
    ]);

    if (!sourceSideResult.ok || !targetSideResult.ok) {
      unavailableNodeTypes.add(nodeType);
    }

    if (sourceSideResult.ok) {
      for (const edge of sourceSideResult.data) {
        contextByCandidate.get(candidateKey(nodeType, edge.source_id))?.push({
          relationshipType: edge.relationship_type,
          direction: "outgoing",
          relatedNodeType: edge.target_type,
          relatedNodeId: edge.target_id,
        });
      }
    }

    if (targetSideResult.ok) {
      for (const edge of targetSideResult.data) {
        contextByCandidate.get(candidateKey(nodeType, edge.target_id))?.push({
          relationshipType: edge.relationship_type,
          direction: "incoming",
          relatedNodeType: edge.source_type,
          relatedNodeId: edge.source_id,
        });
      }
    }
  }

  return { contextByCandidate, unavailableNodeTypes };
}

// ES-011 §10 — one grouped supabaseSelect per distinct node_type among
// candidates, using the explicit table mapping above; the returned
// shape is discriminated by node_type (title+slug for six types,
// text+slug for principle). A candidate is present in
// `sourceByCandidate` only when its lookup call succeeded AND a
// matching row was found — both are required for sourceStatus "ok"
// (see retrieve() below).
async function fetchSourceAttribution(candidates: BaseCandidate[]): Promise<{
  sourceByCandidate: Map<string, Source>;
  missingSourceRows: Array<{ nodeType: NodeType; nodeId: string }>;
}> {
  const sourceByCandidate = new Map<string, Source>();
  const missingSourceRows: Array<{ nodeType: NodeType; nodeId: string }> = [];
  const grouped = groupNodeIdsByType(candidates);

  for (const [nodeType, nodeIds] of grouped) {
    const table = NODE_TABLE_BY_TYPE[nodeType];
    const idList = `in.(${nodeIds.join(",")})`;

    if (nodeType === "principle") {
      const result = await supabaseSelect<PrincipleSourceRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        // Actual lookup-call failure -> "unavailable" downstream, no
        // entries added. Logged distinctly (console.error, not warn)
        // from the missing-row case below, per CTO decision: both
        // collapse to the same public sourceStatus/source, but must
        // stay distinguishable internally.
        console.error("[retrieval] source lookup call failed", {
          nodeType,
          status: result.status,
        });
        continue;
      }

      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          missingSourceRows.push({ nodeType, nodeId });
          continue;
        }
        const source: PrincipleSource = { nodeType: "principle", text: row.text, slug: row.slug };
        sourceByCandidate.set(candidateKey(nodeType, nodeId), source);
      }
    } else {
      const result = await supabaseSelect<TitledSourceRow>(table, { filter: { id: idList } });
      if (!result.ok) {
        // See the principle branch above — same distinct-failure logging.
        console.error("[retrieval] source lookup call failed", {
          nodeType,
          status: result.status,
        });
        continue;
      }

      const rowById = new Map(result.data.map((row) => [row.id, row]));
      for (const nodeId of nodeIds) {
        const row = rowById.get(nodeId);
        if (!row) {
          missingSourceRows.push({ nodeType, nodeId });
          continue;
        }
        const source: TitledSource = {
          nodeType: nodeType as Exclude<NodeType, "principle">,
          title: row.title,
          slug: row.slug,
        };
        sourceByCandidate.set(candidateKey(nodeType, nodeId), source);
      }
    }
  }

  return { sourceByCandidate, missingSourceRows };
}

export async function retrieve(
  queryText: string,
  options: RetrievalOptions = {}
): Promise<RetrievalOutcome> {
  const startedAt = Date.now();

  // ES-011 §5 — all input validation completes before any external or
  // network call. Neither generateEmbedding nor match_node_embeddings
  // is invoked below this point until both checks pass.
  const normalizedQuery = queryText.trim();
  if (normalizedQuery.length === 0) {
    return { ok: false, stage: "validation", message: "Query text must not be empty." };
  }

  let matchCount = DEFAULT_MATCH_COUNT;
  if (options.matchCount !== undefined) {
    if (!Number.isInteger(options.matchCount) || options.matchCount <= 0) {
      return {
        ok: false,
        stage: "validation",
        message: "matchCount must be a positive integer.",
      };
    }
    matchCount = options.matchCount;
  }

  const embeddingResult = await generateEmbedding(normalizedQuery);
  if (!embeddingResult.ok) {
    console.error("[retrieval] embedding generation failed", { status: embeddingResult.status });
    return {
      ok: false,
      stage: "embedding",
      status: embeddingResult.status,
      message: embeddingResult.message,
    };
  }

  const vectorResult = await supabaseRpc<MatchNodeEmbeddingRow>("match_node_embeddings", {
    query_embedding: embeddingResult.embedding,
    match_model: EMBEDDING_MODEL,
    node_type_filter: null,
    match_count: matchCount,
  });

  if (!vectorResult.ok) {
    console.error("[retrieval] vector retrieval failed", { status: vectorResult.status });
    return {
      ok: false,
      stage: "vector_retrieval",
      status: vectorResult.status,
      message: vectorResult.message,
    };
  }

  // ES-011 §9 — cosine distance is the sole ranking key; node_id
  // ascending is the deterministic tie-break, enforced structurally
  // here rather than relied upon from SQL row order alone.
  const orderedRows = [...vectorResult.data].sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.node_id < b.node_id) return -1;
    if (a.node_id > b.node_id) return 1;
    return 0;
  });

  const baseCandidates: BaseCandidate[] = orderedRows.map((row, index) => ({
    rank: index + 1,
    nodeType: row.node_type,
    nodeId: row.node_id,
    distance: row.distance,
  }));

  const [{ contextByCandidate, unavailableNodeTypes: graphUnavailableTypes }, sourceLookup] =
    await Promise.all([fetchRelationshipContext(baseCandidates), fetchSourceAttribution(baseCandidates)]);

  const { sourceByCandidate, missingSourceRows } = sourceLookup;

  if (missingSourceRows.length > 0) {
    // ES-011 implementation-safety check (CTO review, fourth
    // correction round): a source lookup call that succeeds but
    // returns no matching row for a candidate is neither a lookup
    // failure nor a successful attribution. No new status is
    // invented and nothing is fabricated — this is treated as
    // sourceStatus "unavailable" (source: null), the closest existing
    // honest state, and logged distinctly here so it is never
    // silently absorbed.
    console.warn("[retrieval] source lookup succeeded but no matching row found", {
      candidates: missingSourceRows,
    });
  }

  let anyGraphUnavailable = false;
  let anySourceUnavailable = false;

  const candidates: RetrievalCandidate[] = baseCandidates.map((candidate) => {
    const key = candidateKey(candidate.nodeType, candidate.nodeId);

    const relationshipContextStatus: "ok" | "unavailable" = graphUnavailableTypes.has(candidate.nodeType)
      ? "unavailable"
      : "ok";
    if (relationshipContextStatus === "unavailable") anyGraphUnavailable = true;

    const source = sourceByCandidate.get(key) ?? null;
    const sourceStatus: "ok" | "unavailable" = source !== null ? "ok" : "unavailable";
    if (sourceStatus === "unavailable") anySourceUnavailable = true;

    return {
      rank: candidate.rank,
      nodeType: candidate.nodeType,
      nodeId: candidate.nodeId,
      similarity: { distance: candidate.distance },
      source,
      sourceStatus,
      relationshipContext: contextByCandidate.get(key) ?? [],
      relationshipContextStatus,
    };
  });

  const result: RetrievalResult = {
    query: {
      text: normalizedQuery,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    },
    candidates,
    metadata: {
      totalCandidates: candidates.length,
      modelUsed: EMBEDDING_MODEL,
      generatedAt: new Date().toISOString(),
      graphExpansion: anyGraphUnavailable ? "partial" : "complete",
      sourceAttribution: anySourceUnavailable ? "partial" : "complete",
    },
  };

  // ES-011 §16 — structural logging only: no raw query text, no
  // embedding vector.
  console.log("[retrieval] query complete", {
    candidateCount: candidates.length,
    latencyMs: Date.now() - startedAt,
    graphExpansion: result.metadata.graphExpansion,
    sourceAttribution: result.metadata.sourceAttribution,
  });

  return { ok: true, data: result };
}
