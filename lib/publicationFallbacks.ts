import type { PublicationInsight } from "./content/types";

// Fallback derivation for publications with no curated entry in
// publicationEnhancements.ts — always sourced from the publication's own
// excerpt/description, never fabricated, so a brand-new Sanctum publication
// still gets a coherent (if generic) page the moment it's published.

export function deriveIntelligenceBrief(description: string): string[] {
  return [description];
}

export function deriveCentralQuestion(description: string): string {
  return description;
}

export function deriveKeyInsights(description: string): PublicationInsight[] {
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, 3).map((sentence, index) => ({
    title: `Insight ${String(index + 1).padStart(2, "0")}`,
    description: sentence,
  }));
}
