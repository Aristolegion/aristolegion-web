import type { MetadataRoute } from "next";
import { essays } from "@/lib/content/essays";
import { publications } from "@/lib/content/library";

const BASE_URL = "https://aristolegion.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/manifesto`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${BASE_URL}/founder`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/library`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/essays`, changeFrequency: "weekly", priority: 0.8 },
    {
      url: `${BASE_URL}/inner-circle`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/inner-circle/apply`,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];

  const essayRoutes: MetadataRoute.Sitemap = essays.map((essay) => ({
    url: `${BASE_URL}/essays/${essay.slug}`,
    lastModified: essay.publishDate,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const publicationRoutes: MetadataRoute.Sitemap = publications.map(
    (publication) => ({
      url: `${BASE_URL}/library/${publication.slug}`,
      lastModified: publication.publishDate,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  );

  return [...staticRoutes, ...essayRoutes, ...publicationRoutes];
}
