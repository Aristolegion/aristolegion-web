import type { Publication } from "./types";

export const publications: Publication[] = [
  {
    slug: "the-glass-partition",
    title: "The Glass Partition",
    subtitle:
      "A study of invisible barriers in modern institutions, told as reflective fiction.",
    category: "Novel",
    author: "Uday Anshuman",
    publishDate: "2026-02-14",
    readingTime: "14 min read",
    coverImage: "/images/glass-partition.png",
    excerpt: "A study of invisible barriers in modern institutions.",
    sections: [
      {
        heading: "I.",
        paragraphs: [
          "The thirty-eighth floor was glass on every side, and Mira had stopped noticing the view years ago. What she noticed instead was the partition — a single pane separating the executive floor from the one beneath it, thin enough to see through, solid enough that no sound had ever crossed it in six years.",
          "She had worked beneath that glass long before she was invited above it. The invitation changed nothing about the building. It changed everything about how she read a room.",
        ],
        quote:
          "The partition was never about keeping people out. It was about deciding, quietly, who was already in.",
      },
      {
        heading: "II.",
        paragraphs: [
          "From above, the floor below looked orderly — rows of desks, the low hum of people trying to be noticed by someone who could not see them. From below, the floor above had looked the same way for six years: closer, brighter, and entirely silent.",
          "Mira understood, standing on the new side of the glass for the first time, that she had spent six years mistaking proximity for access. The partition had never moved. She had simply been handed a door.",
        ],
      },
      {
        heading: "A Note on This Excerpt",
        paragraphs: [
          "The Glass Partition is a full-length work of reflective fiction exploring the quiet architecture of modern institutions — who is granted access, who is merely granted a view, and what changes once the glass is crossed. The pages above are drawn from its opening chapter.",
        ],
      },
    ],
    externalLinks: {
      primary: {
        label: "Read on Amazon Kindle",
        url: "https://www.amazon.in/dp/B0GSSMVXPX",
      },
    },
  },
  {
    slug: "employability-fracture-report",
    title: "Aristolegion Employability Fracture",
    subtitle: "Research on the widening gap between education and capability.",
    category: "Research Report",
    author: "Uday Anshuman",
    publishDate: "2026-04-02",
    readingTime: "11 min read",
    coverImage: "/images/employability-fracture.png",
    excerpt: "Research on the widening gap between education and capability.",
    sections: [
      {
        heading: "Executive Summary",
        paragraphs: [
          "Credentials have never been more abundant, and they have rarely signaled less. Across industries, the distance between what a degree certifies and what a role actually requires has widened into something closer to a fracture than a gap.",
          "This report examines that fracture — not as a hiring inefficiency to be patched, but as a structural feature of how education and capability have quietly decoupled over the past two decades.",
        ],
      },
      {
        heading: "Key Findings",
        list: [
          "Credential issuance has outpaced demonstrated capability across nearly every professional field studied.",
          "Employers increasingly rely on proxies — pedigree, tenure, network — precisely because credentials no longer discriminate reliably.",
          "The individuals most affected by the fracture are often the most capable, not the least.",
          "Closing the fracture requires new instruments for signaling capability, not simply more credentials.",
        ],
      },
      {
        heading: "Why This Matters",
        paragraphs: [
          "Aristolegion treats this fracture as a founding problem rather than a footnote. An institution built on judgment and capability has a direct interest in restoring a reliable signal between what people can do and how that capability is recognized.",
        ],
      },
      {
        heading: "About This Report",
        paragraphs: [
          "This page presents the executive summary of the full Aristolegion Employability Fracture report. The complete research, methodology, and data are part of the ongoing Aristolegion publishing program.",
        ],
      },
    ],
  },
  {
    slug: "intelligence-journal",
    title: "Aristolegion Intelligence Journal",
    subtitle: "Periodic dispatches on judgment, authority, and human excellence.",
    category: "Executive Journal",
    author: "Uday Anshuman",
    publishDate: "2026-06-01",
    readingTime: "9 min read",
    coverImage: "/images/intelligence-journal.png",
    excerpt: "Periodic dispatches on judgment, authority, and human excellence.",
    sections: [
      {
        heading: "Editor's Note",
        paragraphs: [
          "The Aristolegion Intelligence Journal exists for a narrow purpose: to say something true and useful about judgment, authority, and human excellence, on a regular schedule, without pretending urgency where none exists.",
          "Each issue gathers a small number of dispatches — observations drawn from research, practice, and the ordinary friction of building something that intends to last.",
        ],
      },
      {
        heading: "In This Issue",
        list: [
          "On Judgment as a Compounding Asset",
          "Authority Without Position: A Working Definition",
          "What Institutions Forget First",
          "Notes on Resilience Under Acceleration",
        ],
      },
      {
        heading: "From the Desk",
        paragraphs: [
          "This issue, like every issue before it, is written for readers who would rather think clearly than think quickly. We hope it rewards a second reading as much as the first.",
        ],
      },
    ],
    externalLinks: {
      primary: {
        label: "Read the Newsletter on LinkedIn",
        url: "https://www.linkedin.com/newsletters/aristolegion-7431645810452484097/",
      },
    },
  },
  {
    slug: "capability-dividend",
    title: "Capability Dividend™",
    subtitle: "Why capability has become the last remaining competitive advantage.",
    category: "Research Framework",
    author: "Uday Anshuman",
    publishDate: "2026-06-20",
    readingTime: "7 min read",
    coverImage: "/images/intelligence-journal.png",
    excerpt: "Why capability has become the last remaining competitive advantage.",
    sections: [
      {
        heading: "The Framework",
        paragraphs: [
          "Capital compounds. So does capability — though almost no one measures it that way. The Capability Dividend framework treats human capability as an asset class: something that can be invested in deliberately, measured honestly, and compounded over a career rather than consumed by it.",
          "Where most professional development is treated as a cost — training budgets, certification cycles, one-time courses — the framework asks a different question: what would it look like to manage capability the way disciplined investors manage capital?",
        ],
      },
      {
        heading: "Core Principles",
        list: [
          "Capability compounds when it is deliberately reinvested, not merely accumulated.",
          "Judgment is the multiplier that determines how much a given capability is worth.",
          "Short-term credentialing without long-term compounding produces the appearance of growth without the substance.",
          "The Capability Dividend is realized over years, not quarters.",
        ],
      },
      {
        heading: "Applying the Framework",
        paragraphs: [
          "For individuals, the framework reframes career decisions around long-term compounding rather than short-term signaling. For institutions, it offers a language for evaluating whether their people are actually growing more capable — or simply accumulating credentials.",
        ],
      },
    ],
  },
];

export function getPublication(slug: string): Publication | undefined {
  return publications.find((publication) => publication.slug === slug);
}

export function getRelatedPublications(
  slug: string,
  limit = 3
): Publication[] {
  return publications
    .filter((publication) => publication.slug !== slug)
    .slice(0, limit);
}
