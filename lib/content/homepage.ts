import type {
  FooterColumn,
  Founder,
  InProgressItem,
  LibraryItem,
  NavLink,
  SiteMeta,
} from "./types";

export const siteMeta: SiteMeta = {
  name: "Aristolegion",
  motto: "Where Elegance Meets Strength. Brilliance Meets Fortitude.",
  positioning:
    "An intellectual house dedicated to ideas, stories, research, frameworks, and communities that cultivate judgment, capability, authority, resilience, and human excellence.",
  title: "Aristolegion — Where Elegance Meets Strength",
  description:
    "A modern intellectual house dedicated to ideas, research, frameworks, and communities that cultivate judgment, capability, and human excellence.",
};

export const navLinks: NavLink[] = [
  { label: "Manifesto", href: "#manifesto" },
  { label: "Library", href: "#library" },
  { label: "In Progress", href: "#in-progress" },
  { label: "Essays", href: "#essays" },
  { label: "Founder", href: "#founder" },
  { label: "Inner Circle", href: "#inner-circle" },
];

export const libraryItems: LibraryItem[] = [
  {
    id: "glass-partition",
    title: "The Glass Partition",
    description: "A study of invisible barriers in modern institutions.",
    href: "/library/the-glass-partition",
  },
  {
    id: "employability-fracture",
    title: "Employability Fracture Report",
    description: "Research on the widening gap between education and capability.",
    href: "/library/employability-fracture-report",
  },
  {
    id: "intelligence-journal",
    title: "Aristolegion Intelligence Journal",
    description: "Periodic dispatches on judgment, authority, and human excellence.",
    href: "/library/intelligence-journal",
  },
];

export const inProgressItems: InProgressItem[] = [
  {
    id: "capability-dividend",
    title: "Capability Dividend™",
    description:
      "A framework for measuring and compounding human capability over time.",
    href: "/in-progress/capability-dividend",
  },
  {
    id: "inner-circle-founding",
    title: "Inner Circle Founding Cohort",
    description:
      "The inaugural application-based cohort cultivating judgment and excellence.",
    href: "/in-progress/inner-circle-founding-cohort",
  },
  {
    id: "future-research",
    title: "Future Research Publications",
    description:
      "Forthcoming studies on authority, resilience, and institutional judgment.",
    href: "/in-progress/future-research",
  },
];

export const founder: Founder = {
  name: "Uday Anshuman",
  title: "Founder, Aristolegion",
  bio: "Placeholder biography — to be written.",
  href: "/founder",
};

export const footerColumns: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "Manifesto", href: "/manifesto" },
      { label: "Library", href: "#library" },
      { label: "Essays", href: "#essays" },
      { label: "In Progress", href: "#in-progress" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "About", href: "/about" },
      { label: "Founder", href: "#founder" },
      { label: "Inner Circle", href: "#inner-circle" },
      { label: "Constitution", href: "/constitution" },
    ],
  },
  {
    title: "Connect",
    links: [{ label: "Contact", href: "/contact" }],
  },
];
