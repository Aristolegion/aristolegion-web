import type { Domain } from "./types";

// Taxonomy cards for the Essays archive's "Areas of Inquiry" section — display
// only, not routed. Reuses the Domain shape (number/title/description) since
// it's identical to what SixPillars/DomainsOfExploration already render.
export const essayCollections: Domain[] = [
  {
    number: "01",
    title: "Human Capability",
    description:
      "Exploring learning, adaptability, skill evolution, and enduring professional advantage.",
  },
  {
    number: "02",
    title: "Leadership Intelligence",
    description:
      "Examining judgment, responsibility, decision-making, and leadership effectiveness.",
  },
  {
    number: "03",
    title: "Future of Work",
    description:
      "Studying the transformation of careers, organizations, and talent systems.",
  },
  {
    number: "04",
    title: "Systems Thinking",
    description:
      "Understanding the structures, environments, and cultures that shape performance.",
  },
];
