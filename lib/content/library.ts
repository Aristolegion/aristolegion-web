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
