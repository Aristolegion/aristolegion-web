import type { PublicationFrameworkPreview, PublicationInsight } from "./types";

export interface PublicationEnhancement {
  match: (title: string) => boolean;
  intelligenceBrief?: string[];
  centralQuestion?: string;
  keyInsights?: PublicationInsight[];
  framework?: PublicationFrameworkPreview;
}

// Curated deep-content for individual publication detail pages, keyed by a
// title match rather than slug — the hosted Sanctum publications' real
// slugs are assigned at creation time in the CMS and aren't guaranteed to
// match any convention here, so matching by title (same approach already
// used for the homepage and /library curation) is the reliable lookup.
// Publications without an entry fall back to content derived from their
// own description/category — see lib/publicationFallbacks.ts.
export const publicationEnhancements: PublicationEnhancement[] = [
  {
    match: (title) => title.includes("capability dividend"),
    intelligenceBrief: [
      "Knowledge is becoming abundant.",
      "Skills are becoming temporary.",
      "The next advantage belongs to individuals and organizations capable of transforming information into judgment, execution, and measurable impact.",
    ],
    centralQuestion:
      "When everyone has access to the same information, what creates lasting advantage?",
    keyInsights: [
      {
        title: "Knowledge Is No Longer The Advantage",
        description: "Access to information has been democratized.",
      },
      {
        title: "Judgment Becomes The Multiplier",
        description: "Interpretation and decision quality create differentiation.",
      },
      {
        title: "Capability Compounds",
        description: "Applied learning creates durable advantage.",
      },
    ],
    framework: {
      title: "The Capability Dividend™ Model",
      steps: ["Knowledge", "Skill", "Judgment", "Capability", "Impact"],
    },
  },
  {
    match: (title) => title.includes("employability fracture"),
    intelligenceBrief: [
      "Credentials once served as a reliable proxy for capability.",
      "That signal is breaking down.",
      "The individuals and organizations who thrive next will be the ones who can demonstrate capability directly, not merely claim it.",
    ],
    centralQuestion:
      "When traditional qualifications lose predictive power, what defines true employability?",
    keyInsights: [
      {
        title: "Credentials Are Losing Signal Strength",
        description: "Traditional markers no longer fully predict performance.",
      },
      {
        title: "Adaptability Creates Advantage",
        description: "Learning velocity determines future readiness.",
      },
      {
        title: "Capability Defines Employability",
        description: "The future rewards demonstrated capability.",
      },
    ],
  },
];

export function getPublicationEnhancement(title: string): PublicationEnhancement | undefined {
  const lowerTitle = title.toLowerCase();
  return publicationEnhancements.find((entry) => entry.match(lowerTitle));
}
