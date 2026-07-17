import type { MetadataRoute } from "next";
import { essays } from "@/lib/content/essays";
import { publications } from "@/lib/content/library";
import { supabaseSelect } from "@/lib/supabase";
import type { Essay as HostedEssay, Publication as HostedPublication } from "@/lib/sanctum/types";

const BASE_URL = "https://aristolegion.com";

// Canonical DB content (essays/publications) was previously missing from
// this sitemap entirely — it only ever read the two static content arrays.
// ES-008A surfaced this as a pre-existing gap (not something it
// introduced): the 3 live, published Sanctum publications had no sitemap
// entry before this change, independent of the static-content promotion
// itself. Fetched here alongside the (now much smaller) static arrays so
// every published essay/publication, static or hosted, gets a URL.
async function getHostedEssayRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const result = await supabaseSelect<HostedEssay>("essays", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      return result.data.map((essay) => ({
        url: `${BASE_URL}/essays/${essay.slug}`,
        lastModified: essay.published_at ?? essay.created_at,
        changeFrequency: "monthly",
        priority: 0.6,
      }));
    }

    console.error("SITEMAP ESSAYS FETCH ERROR:", { status: result.status, message: result.message });
  } catch (error) {
    console.error("SITEMAP ESSAYS FETCH ERROR:", error);
  }

  return [];
}

async function getHostedPublicationRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      return result.data.map((publication) => ({
        url: `${BASE_URL}/library/${publication.slug}`,
        lastModified: publication.published_at ?? publication.created_at,
        changeFrequency: "monthly",
        priority: 0.7,
      }));
    }

    console.error("SITEMAP PUBLICATIONS FETCH ERROR:", { status: result.status, message: result.message });
  } catch (error) {
    console.error("SITEMAP PUBLICATIONS FETCH ERROR:", error);
  }

  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const staticEssayRoutes: MetadataRoute.Sitemap = essays.map((essay) => ({
    url: `${BASE_URL}/essays/${essay.slug}`,
    lastModified: essay.publishDate,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const staticPublicationRoutes: MetadataRoute.Sitemap = publications.map(
    (publication) => ({
      url: `${BASE_URL}/library/${publication.slug}`,
      lastModified: publication.publishDate,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  );

  const [hostedEssayRoutes, hostedPublicationRoutes] = await Promise.all([
    getHostedEssayRoutes(),
    getHostedPublicationRoutes(),
  ]);

  return [
    ...staticRoutes,
    ...staticEssayRoutes,
    ...staticPublicationRoutes,
    ...hostedEssayRoutes,
    ...hostedPublicationRoutes,
  ];
}
