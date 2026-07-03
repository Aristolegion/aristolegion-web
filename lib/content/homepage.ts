import { publications } from "./library";
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
    "An independent intellectual institution dedicated to cultivating judgment, capability, leadership, resilience, and human excellence through research, publications, essays, frameworks, and communities.",
  title: "Aristolegion — Where Elegance Meets Strength",
  description:
    "An independent intellectual institution dedicated to research, publications, frameworks, and communities that cultivate judgment, capability, and human excellence.",
};

export const navLinks: NavLink[] = [
  { label: "Manifesto", href: "/manifesto" },
  { label: "Library", href: "/#library" },
  { label: "In Progress", href: "/#in-progress" },
  { label: "Essays", href: "/essays" },
  { label: "Founder", href: "/founder" },
  { label: "Inner Circle", href: "/inner-circle" },
  { label: "Newsletter", href: "/#newsletter" },
];

export const libraryItems: LibraryItem[] = publications.map((publication) => ({
  id: publication.slug,
  title: publication.title,
  description: publication.excerpt,
  href: `/library/${publication.slug}`,
  image: publication.coverImage,
  category: publication.category,
}));

export const inProgressItems: InProgressItem[] = [
  {
    id: "capability-dividend",
    title: "Capability Dividend™",
    description:
      "A framework for measuring and compounding human capability over time.",
  },
  {
    id: "inner-circle-founding",
    title: "Inner Circle Founding Cohort",
    description:
      "The inaugural application-based cohort cultivating judgment and excellence.",
  },
  {
    id: "future-research",
    title: "Future Research Publications",
    description:
      "Forthcoming studies on authority, resilience, and institutional judgment.",
  },
];

export const founder: Founder = {
  name: "Uday Anshuman",
  title: "Founder, Aristolegion",
  bio: "Uday Anshuman founded Aristolegion to build the research, publications, and frameworks that cultivate judgment, capability, and human excellence in an age of accelerating change.",
  href: "/founder",
};

export const footerColumns: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "Manifesto", href: "/manifesto" },
      { label: "Library", href: "/#library" },
      { label: "Essays", href: "/essays" },
      { label: "In Progress", href: "/#in-progress" },
      { label: "Newsletter", href: "/#newsletter" },
    ],
  },
  {
    title: "The Institution",
    links: [
      { label: "Founder", href: "/founder" },
      { label: "Inner Circle", href: "/inner-circle" },
    ],
  },
];
