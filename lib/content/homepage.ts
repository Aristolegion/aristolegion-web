import type {
  Domain,
  FooterColumn,
  Founder,
  InProgressItem,
  NavLink,
  Pillar,
  SiteMeta,
} from "./types";

export const siteMeta: SiteMeta = {
  name: "Aristolegion",
  motto: "Where Elegance Meets Strength. Brilliance Meets Fortitude.",
  positioning:
    "An independent intellectual institution dedicated to cultivating judgment, capability, leadership, resilience, and human excellence through research, publications, essays, frameworks, and communities.",
  title: "Aristolegion® | Leadership Intelligence & Human Capability Research",
  description:
    "Aristolegion is an intellectual house founded by Uday Anshuman exploring leadership, judgement, capability, strategy and human potential.",
};

export const navLinks: NavLink[] = [
  { label: "Manifesto", href: "/manifesto" },
  { label: "Library", href: "/library" },
  { label: "In Progress", href: "/#in-progress" },
  { label: "Essays", href: "/essays" },
  { label: "Founder", href: "/founder" },
  { label: "Inner Circle", href: "/inner-circle" },
  { label: "Newsletter", href: "/#newsletter" },
];

export const inProgressItems: InProgressItem[] = [
  {
    id: "capability-dividend",
    title: "Capability Dividend™",
    description:
      "A longitudinal framework studying how human capability compounds beyond credentials and skills.",
  },
  {
    id: "inner-circle-founding",
    title: "Inner Circle Founding Cohort",
    description:
      "A selective learning community exploring judgment, leadership, and capability development.",
  },
  {
    id: "future-research",
    title: "Future Research Publications",
    description:
      "Upcoming studies examining intelligence, institutions, and human performance.",
  },
];

export const pillars: Pillar[] = [
  {
    number: "01",
    title: "Judgment",
    description: "Decision-making beyond information.",
  },
  {
    number: "02",
    title: "Capability",
    description: "The ability to convert knowledge into meaningful impact.",
  },
  {
    number: "03",
    title: "Character",
    description: "Strength and consistency under uncertainty.",
  },
  {
    number: "04",
    title: "Learning",
    description: "The continuous evolution of intelligence.",
  },
  {
    number: "05",
    title: "Wisdom",
    description: "Experience transformed into understanding.",
  },
  {
    number: "06",
    title: "Human Excellence",
    description: "The pursuit of higher standards.",
  },
];

export const domains: Domain[] = [
  {
    number: "01",
    title: "Human Capability",
    description:
      "How individuals build enduring advantage beyond skills and credentials.",
  },
  {
    number: "02",
    title: "Leadership Intelligence",
    description:
      "How judgment, responsibility, and decision-making create meaningful impact.",
  },
  {
    number: "03",
    title: "Future of Work",
    description:
      "How careers, organizations, and talent systems evolve in an age of acceleration.",
  },
  {
    number: "04",
    title: "Human Systems",
    description: "How environments, structures, and cultures shape performance.",
  },
];

export const founder: Founder = {
  name: "Uday Anshuman",
  title: "Founder, Aristolegion",
  bio: "Uday Anshuman founded Aristolegion from his work across talent systems, learning, and capability development. His work explores how individuals and institutions adapt in an era where knowledge is abundant but judgment remains scarce.",
  bioParagraphs: [
    "Uday Anshuman founded Aristolegion from his work across talent systems, learning, and capability development.",
    "His work explores how individuals and institutions adapt in an era where knowledge is abundant but judgment remains scarce.",
  ],
  href: "/founder",
};

export const footerColumns: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "Manifesto", href: "/manifesto" },
      { label: "Library", href: "/library" },
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
