import type { RetrievalCandidate } from "@/lib/retrieval/types";

// ES-012 Implementation Specification §C — required before anything else
// touches the candidate list. match_node_embeddings operates over
// (node_type, node_id, chunk_index) rows (migration 0010), and
// RetrievalCandidate carries no chunk_index, so a multi-chunk node would
// surface as two indistinguishable-looking candidates with different
// distances. Confirmed in app/api/internal/embeddings/reconcile/route.ts:
// chunk_index is hardcoded to 0 today (no chunking logic exists), so this
// case does not currently occur in production — but nothing in ES-011's
// contract guarantees that stays true, and Gate B / Source Coherence would
// silently miscount the same source twice as independent corroboration if
// it ever did. This function costs nothing when the input already has no
// duplicates.
export function deduplicateCandidates(candidates: RetrievalCandidate[]): {
  deduplicated: RetrievalCandidate[];
  duplicatesRemoved: number;
} {
  const bestByKey = new Map<string, RetrievalCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.nodeType}:${candidate.nodeId}`;
    const existing = bestByKey.get(key);
    if (!existing || candidate.similarity.distance < existing.similarity.distance) {
      bestByKey.set(key, candidate);
    }
  }

  const deduplicated = Array.from(bestByKey.values()).sort((a, b) => a.rank - b.rank);

  return {
    deduplicated,
    duplicatesRemoved: candidates.length - deduplicated.length,
  };
}
