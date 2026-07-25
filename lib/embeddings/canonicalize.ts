import { createHash } from "node:crypto";
import type { Essay, Publication } from "@/lib/sanctum/types";
import type { PublicationSection } from "@/lib/content/types";

// Canonicalization rules for each of the 7 node types, exactly as
// defined in the ES-010 Engineering Specification (Revision 2 §1,
// carried unchanged through the Final Specification Freeze). Every
// column inclusion/exclusion and every jsonb rendering template here
// mirrors that section precisely — no additional rule is introduced.
//
// The single most important property: content_hash is always computed
// from the exact same canonical text that gets embedded (see
// hashCanonicalText below and its callers in the reconciliation
// worker), so the hash and the embedded text can never drift apart.

export type NodeType =
  | "essay"
  | "publication"
  | "framework"
  | "principle"
  | "concept"
  | "topic"
  | "manifesto";

export const NODE_TYPES: NodeType[] = [
  "essay",
  "publication",
  "framework",
  "principle",
  "concept",
  "topic",
  "manifesto",
];

export interface FrameworkRow {
  title: string;
  description: string;
  steps: string[] | null;
}

export interface PrincipleRow {
  text: string;
}

export interface ConceptRow {
  title: string;
  summary: string;
}

export interface TopicRow {
  title: string;
  summary: string;
}

export interface ManifestoRow {
  title: string;
  sections: PublicationSection[];
}

// Joins non-empty segments with a fixed "\n\n" separator. A null,
// undefined, or whitespace-only segment is omitted entirely — never
// rendered as the literal string "null" or an empty placeholder.
function joinSegments(segments: Array<string | null | undefined>): string {
  return segments
    .filter((segment): segment is string => Boolean(segment && segment.trim().length > 0))
    .join("\n\n");
}

// key_insights renders each {title, description} entry as one line,
// in stored array order — never re-sorted, never JSON-dumped.
function renderKeyInsights(insights: Publication["key_insights"]): string | null {
  if (!insights || insights.length === 0) return null;
  return insights.map((insight) => `${insight.title}: ${insight.description}`).join("\n");
}

// A PublicationSection's shape is heterogeneous (heading/paragraphs/
// list/quote, each optional) — this is the one fixed template used for
// both publications.content and manifesto.sections, since both share
// the identical PublicationSection shape.
function renderSection(section: PublicationSection): string {
  return joinSegments([
    section.heading ?? null,
    section.paragraphs && section.paragraphs.length > 0 ? section.paragraphs.join("\n") : null,
    section.list && section.list.length > 0 ? section.list.join(", ") : null,
    section.quote ?? null,
  ]);
}

function renderSections(sections: PublicationSection[] | null | undefined): string | null {
  if (!sections || sections.length === 0) return null;
  return sections.map(renderSection).join("\n\n");
}

// steps is order-preserving: the sequence is semantically meaningful
// (an ordered progression, per RFC-003's `operationalizes` framing),
// so it is arrow-joined in stored order, never alphabetized.
function renderSteps(steps: string[] | null): string | null {
  if (!steps || steps.length === 0) return null;
  return steps.join(" → ");
}

export function canonicalizeEssay(essay: Pick<Essay, "title" | "excerpt" | "content">): string {
  return joinSegments([essay.title, essay.excerpt, essay.content]);
}

// publications.framework (jsonb) is deliberately excluded: it is a
// legacy embedded copy of data now canonical in the frameworks table
// (RFC-002 §1's fragmentation finding, resolved by ES-006/ES-007's
// `introduces` edge). Including it here would re-duplicate content
// that already gets its own embedding via canonicalizeFramework below.
export function canonicalizePublication(
  publication: Pick<
    Publication,
    | "title"
    | "description"
    | "intelligence_brief"
    | "central_question"
    | "key_insights"
    | "content"
  >
): string {
  return joinSegments([
    publication.title,
    publication.description,
    publication.intelligence_brief,
    publication.central_question,
    renderKeyInsights(publication.key_insights),
    renderSections(publication.content),
  ]);
}

export function canonicalizeFramework(framework: FrameworkRow): string {
  return joinSegments([framework.title, framework.description, renderSteps(framework.steps)]);
}

// A Principle's `text` is already, by RFC-003 §3's own design, the
// complete atomic content of the node — no concatenation needed.
export function canonicalizePrinciple(principle: PrincipleRow): string {
  return principle.text;
}

// All 8 sections are included, not only the 5 independently promoted
// to `principles` rows in ES-007 — per 0007_promote_manifesto.sql's
// TASK 3 NOTE, the manifesto table is already the complete-document
// representation; embedding it completely continues that decision.
export function canonicalizeManifesto(manifesto: ManifestoRow): string {
  return joinSegments([manifesto.title, renderSections(manifesto.sections)]);
}

export function canonicalizeConcept(concept: ConceptRow): string {
  return joinSegments([concept.title, concept.summary]);
}

export function canonicalizeTopic(topic: TopicRow): string {
  return joinSegments([topic.title, topic.summary]);
}

// SHA-256 via Node's built-in crypto — no new dependency. Chosen
// because pgcrypto (which provides SHA-256 in Postgres too) is already
// installed in this database, though the hash is computed here, in the
// same process that calls the embedding provider, so content_hash and
// the embedded text are guaranteed to originate from one canonical
// string.
export function hashCanonicalText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
