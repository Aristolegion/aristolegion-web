import type { Domain } from "./types";

// "Who It Is For" cards on the Inner Circle page — display only. Reuses the
// Domain shape (number/title/description) since it's identical to what
// SixPillars/DomainsOfExploration/essayCollections already render.
export const innerCircleAudience: Domain[] = [
  {
    number: "01",
    title: "Builders",
    description: "People creating meaningful work, ideas, and systems.",
  },
  {
    number: "02",
    title: "Leaders",
    description:
      "Individuals responsible for decisions, teams, and transformation.",
  },
  {
    number: "03",
    title: "Learners",
    description: "Those committed to continuous capability development.",
  },
  {
    number: "04",
    title: "Thinkers",
    description:
      "People exploring ideas beyond surface-level information.",
  },
];
