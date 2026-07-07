import type { Domain } from "./types";

// Taxonomy cards for the Founder page's "Questions Behind The Work" section —
// display only, not routed. Reuses the Domain shape (number/title/description)
// since it's identical to what SixPillars/DomainsOfExploration/essayCollections
// already render.
export const founderResearchInterests: Domain[] = [
  {
    number: "01",
    title: "Human Capability",
    description:
      "How individuals develop abilities that remain valuable through change.",
  },
  {
    number: "02",
    title: "Leadership Intelligence",
    description: "How judgment and responsibility influence decisions.",
  },
  {
    number: "03",
    title: "Learning Systems",
    description: "How people and organizations continuously evolve.",
  },
  {
    number: "04",
    title: "Future of Work",
    description:
      "How technology and transformation reshape human contribution.",
  },
];
