import {
  canonicalizeConcept,
  canonicalizeEssay,
  canonicalizeFramework,
  canonicalizeManifesto,
  canonicalizePrinciple,
  canonicalizePublication,
  canonicalizeTopic,
  hashCanonicalText,
  NODE_TYPES,
  type NodeType,
} from "@/lib/embeddings/canonicalize";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, generateEmbedding } from "@/lib/embeddings/provider";
import type { Essay, Publication } from "@/lib/sanctum/types";
import { supabaseDelete, supabaseSelect, supabaseUpsert } from "@/lib/supabase";

// ES-010 reconciliation worker. Implements the scheduled-reconciliation
// architecture frozen in the ES-010 Engineering Specification (Revision
// 2 §2) in place of the originally-proposed trigger+pgmq design:
// content-hash comparison against every eligible node, direct
// embedding generation on mismatch, orphan cleanup, and the frozen
// permanent-failure threshold. Invoked hourly by Vercel Cron
// (vercel.json), authenticated via CRON_SECRET per Vercel's standard
// convention — this route calls a paid third-party API and writes to
// production, so it must not be publicly triggerable.
//
// No trigger, no queue, no chunking logic, no application consumption
// of node_embeddings or match_node_embeddings — all explicit ES-010
// non-goals, unchanged here.

export const dynamic = "force-dynamic";

const PERMANENT_FAILURE_THRESHOLD = 5; // frozen in the ES-010 Final Specification Freeze
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

interface NodeEmbeddingRow {
  node_type: NodeType;
  node_id: string;
  chunk_index: number;
  content_hash: string;
}

interface NodeEmbeddingFailureRow {
  node_type: NodeType;
  node_id: string;
  consecutive_failures: number;
}

interface FrameworkRow {
  id: string;
  title: string;
  description: string;
  steps: string[] | null;
}

interface PrincipleRow {
  id: string;
  text: string;
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
  sections: Publication["content"];
}

function nodeKey(nodeType: string, nodeId: string): string {
  return `${nodeType}:${nodeId}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateEmbeddingWithRetry(
  text: string
): Promise<{ ok: true; embedding: number[] } | { ok: false; message: string }> {
  let lastMessage = "unknown error";
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
    const result = await generateEmbedding(text);
    if (result.ok) {
      return { ok: true, embedding: result.embedding };
    }
    lastMessage = `status ${result.status}: ${result.message}`;
  }
  return { ok: false, message: lastMessage };
}

interface EligibleNode {
  nodeType: NodeType;
  nodeId: string;
  canonicalText: string;
}

function collectEligibleNodes({
  essays,
  publications,
  frameworks,
  principles,
  concepts,
  topics,
  manifesto,
}: {
  essays: Essay[];
  publications: Publication[];
  frameworks: FrameworkRow[];
  principles: PrincipleRow[];
  concepts: ConceptRow[];
  topics: TopicRow[];
  manifesto: ManifestoRow[];
}): EligibleNode[] {
  return [
    ...essays.map((row) => ({
      nodeType: "essay" as const,
      nodeId: row.id,
      canonicalText: canonicalizeEssay(row),
    })),
    ...publications.map((row) => ({
      nodeType: "publication" as const,
      nodeId: row.id,
      canonicalText: canonicalizePublication(row),
    })),
    ...frameworks.map((row) => ({
      nodeType: "framework" as const,
      nodeId: row.id,
      canonicalText: canonicalizeFramework(row),
    })),
    ...principles.map((row) => ({
      nodeType: "principle" as const,
      nodeId: row.id,
      canonicalText: canonicalizePrinciple(row),
    })),
    ...concepts.map((row) => ({
      nodeType: "concept" as const,
      nodeId: row.id,
      canonicalText: canonicalizeConcept(row),
    })),
    ...topics.map((row) => ({
      nodeType: "topic" as const,
      nodeId: row.id,
      canonicalText: canonicalizeTopic(row),
    })),
    ...manifesto.map((row) => ({
      nodeType: "manifesto" as const,
      nodeId: row.id,
      canonicalText: canonicalizeManifesto({ title: row.title, sections: row.sections ?? [] }),
    })),
  ];
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [
    essaysResult,
    publicationsResult,
    frameworksResult,
    principlesResult,
    conceptsResult,
    topicsResult,
    manifestoResult,
    existingEmbeddingsResult,
    existingFailuresResult,
  ] = await Promise.all([
    supabaseSelect<Essay>("essays"),
    supabaseSelect<Publication>("publications"),
    supabaseSelect<FrameworkRow>("frameworks"),
    supabaseSelect<PrincipleRow>("principles"),
    supabaseSelect<ConceptRow>("concepts"),
    supabaseSelect<TopicRow>("topics"),
    supabaseSelect<ManifestoRow>("manifesto"),
    supabaseSelect<NodeEmbeddingRow>("node_embeddings", {
      filter: { model: `eq.${EMBEDDING_MODEL}` },
    }),
    supabaseSelect<NodeEmbeddingFailureRow>("node_embedding_failures"),
  ]);

  for (const [label, result] of Object.entries({
    essays: essaysResult,
    publications: publicationsResult,
    frameworks: frameworksResult,
    principles: principlesResult,
    concepts: conceptsResult,
    topics: topicsResult,
    manifesto: manifestoResult,
    existingEmbeddings: existingEmbeddingsResult,
    existingFailures: existingFailuresResult,
  })) {
    if (!result.ok) {
      return Response.json(
        { error: `Failed to read ${label}: status ${result.status}` },
        { status: 502 }
      );
    }
  }

  // Every branch above returned early on !ok, so every result here is
  // the { ok: true, data } variant — narrow accordingly.
  const essays = essaysResult.ok ? essaysResult.data : [];
  const publications = publicationsResult.ok ? publicationsResult.data : [];
  const frameworks = frameworksResult.ok ? frameworksResult.data : [];
  const principles = principlesResult.ok ? principlesResult.data : [];
  const concepts = conceptsResult.ok ? conceptsResult.data : [];
  const topics = topicsResult.ok ? topicsResult.data : [];
  const manifesto = manifestoResult.ok ? manifestoResult.data : [];
  const existingEmbeddings = existingEmbeddingsResult.ok ? existingEmbeddingsResult.data : [];
  const existingFailures = existingFailuresResult.ok ? existingFailuresResult.data : [];

  const eligibleNodes = collectEligibleNodes({
    essays,
    publications,
    frameworks,
    principles,
    concepts,
    topics,
    manifesto,
  });

  const liveNodeKeys = new Set(eligibleNodes.map((node) => nodeKey(node.nodeType, node.nodeId)));

  const existingHashByKey = new Map<string, string>();
  for (const row of existingEmbeddings) {
    existingHashByKey.set(`${nodeKey(row.node_type, row.node_id)}:${row.chunk_index}`, row.content_hash);
  }

  const failureCountByKey = new Map<string, number>();
  for (const row of existingFailures) {
    failureCountByKey.set(nodeKey(row.node_type, row.node_id), row.consecutive_failures);
  }

  let embedded = 0;
  let upToDate = 0;
  let skippedPermanentFailure = 0;
  let failed = 0;

  for (const node of eligibleNodes) {
    const key = nodeKey(node.nodeType, node.nodeId);
    const contentHash = hashCanonicalText(node.canonicalText);
    const existingHash = existingHashByKey.get(`${key}:0`);

    if (existingHash === contentHash) {
      upToDate++;
      continue;
    }

    const priorFailures = failureCountByKey.get(key) ?? 0;
    if (priorFailures >= PERMANENT_FAILURE_THRESHOLD) {
      skippedPermanentFailure++;
      continue;
    }

    const embeddingResult = await generateEmbeddingWithRetry(node.canonicalText);

    if (!embeddingResult.ok) {
      failed++;
      await supabaseUpsert(
        "node_embedding_failures",
        {
          node_type: node.nodeType,
          node_id: node.nodeId,
          consecutive_failures: priorFailures + 1,
          last_attempted_at: new Date().toISOString(),
          last_error: embeddingResult.message,
        },
        "node_type,node_id"
      );
      continue;
    }

    await supabaseUpsert(
      "node_embeddings",
      {
        node_type: node.nodeType,
        node_id: node.nodeId,
        chunk_index: 0,
        content_hash: contentHash,
        model: EMBEDDING_MODEL,
        embedding: embeddingResult.embedding,
      },
      "node_type,node_id,chunk_index,model"
    );
    embedded++;

    if (priorFailures > 0) {
      await supabaseDelete("node_embedding_failures", {
        node_type: node.nodeType,
        node_id: node.nodeId,
      });
    }
  }

  // Orphan cleanup: any node_embeddings or node_embedding_failures row
  // whose source node no longer exists is deleted here. essays and
  // publications can be deleted through Sanctum (confirmed: both
  // app/api/sanctum/essays/[id]/route.ts and
  // app/api/sanctum/publications/[id]/route.ts export a DELETE
  // handler), so this is a real, not speculative, cleanup path.
  let orphansRemoved = 0;
  const seenOrphanKeys = new Set<string>();
  for (const row of existingEmbeddings) {
    const key = nodeKey(row.node_type, row.node_id);
    if (!liveNodeKeys.has(key) && !seenOrphanKeys.has(key)) {
      seenOrphanKeys.add(key);
      await supabaseDelete("node_embeddings", { node_type: row.node_type, node_id: row.node_id });
      orphansRemoved++;
    }
  }
  for (const row of existingFailures) {
    const key = nodeKey(row.node_type, row.node_id);
    if (!liveNodeKeys.has(key)) {
      await supabaseDelete("node_embedding_failures", {
        node_type: row.node_type,
        node_id: row.node_id,
      });
    }
  }

  return Response.json({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    nodeTypesScanned: NODE_TYPES,
    totalEligible: eligibleNodes.length,
    upToDate,
    embedded,
    failed,
    skippedPermanentFailure,
    orphansRemoved,
  });
}
