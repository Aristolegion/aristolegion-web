import type { NodeType } from "@/lib/embeddings/canonicalize";

// ES-011: Retrieval Service. Types for the RetrievalResult contract
// frozen in the ES-011 specification §12, including the discriminated
// `source` union frozen in the fourth specification revision (essay,
// publication, framework, concept, topic, manifesto carry title+slug;
// principle carries text+slug — principles has no title column).

export interface RetrievalOptions {
  matchCount?: number;
}

export type TitledSource = {
  nodeType: Exclude<NodeType, "principle">;
  title: string;
  slug: string;
};

export type PrincipleSource = {
  nodeType: "principle";
  text: string;
  slug: string;
};

export type Source = TitledSource | PrincipleSource;

export interface RelationshipContextEntry {
  relationshipType: string;
  direction: "outgoing" | "incoming";
  relatedNodeType: NodeType;
  relatedNodeId: string;
}

export interface RetrievalCandidate {
  rank: number;
  nodeType: NodeType;
  nodeId: string;
  similarity: { distance: number };
  source: Source | null;
  sourceStatus: "ok" | "unavailable";
  relationshipContext: RelationshipContextEntry[];
  relationshipContextStatus: "ok" | "unavailable";
}

export interface RetrievalResult {
  query: {
    text: string;
    embeddingModel: string;
    embeddingDimensions: number;
  };
  candidates: RetrievalCandidate[];
  metadata: {
    totalCandidates: number;
    modelUsed: string;
    generatedAt: string;
    graphExpansion: "complete" | "partial";
    sourceAttribution: "complete" | "partial";
  };
}

export type RetrievalFailure =
  | { ok: false; stage: "validation"; message: string }
  | { ok: false; stage: "embedding"; status: number; message: string }
  | { ok: false; stage: "vector_retrieval"; status: number; message: string };

export type RetrievalOutcome = { ok: true; data: RetrievalResult } | RetrievalFailure;
