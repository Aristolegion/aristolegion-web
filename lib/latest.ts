import { excerptFromMarkdown } from "@/lib/markdown";
import type { Essay, NewsletterIssue, Publication } from "@/lib/sanctum/types";
import { supabaseSelect } from "@/lib/supabase";

export type LatestItemType = "publication" | "essay" | "newsletter";

export interface LatestItem {
  id: string;
  type: LatestItemType;
  title: string;
  description: string;
  /** ISO timestamp — published_at when the content type has one, created_at otherwise. */
  date: string;
  href: string;
}

const DEFAULT_LIMIT = 6;

async function fetchPublished<T>(table: string): Promise<T[]> {
  try {
    const result = await supabaseSelect<T>(table, { filter: { status: "eq.published" } });

    if (!result.ok) {
      console.error("LATEST INTELLIGENCE ERROR:", {
        source: table,
        status: result.status,
        message: result.message,
      });
      return [];
    }

    return result.data;
  } catch (error) {
    console.error("LATEST INTELLIGENCE ERROR:", { source: table, error });
    return [];
  }
}

/**
 * Server-only aggregation across the three Sanctum-published content types
 * for the homepage "Latest From Aristolegion" section. Uses the same
 * service-role Supabase helpers as every other server component in this
 * app — never imported from client code, so the service key never reaches
 * the browser. A failed fetch for one content type degrades to an empty
 * list for that type rather than failing the whole section.
 */
export async function getLatestIntelligence(limit = DEFAULT_LIMIT): Promise<LatestItem[]> {
  const [publications, essays, newsletterIssues] = await Promise.all([
    fetchPublished<Publication>("publications"),
    fetchPublished<Essay>("essays"),
    fetchPublished<NewsletterIssue>("newsletter_issues"),
  ]);

  const items: LatestItem[] = [
    ...publications.map(
      (publication): LatestItem => ({
        id: publication.id,
        type: "publication",
        title: publication.title,
        description: publication.description,
        date: publication.published_at ?? publication.created_at,
        href: `/library/${publication.slug}`,
      })
    ),
    ...essays.map(
      (essay): LatestItem => ({
        id: essay.id,
        type: "essay",
        title: essay.title,
        description: excerptFromMarkdown(essay.content),
        date: essay.published_at ?? essay.created_at,
        href: `/essays/${essay.slug}`,
      })
    ),
    // Newsletter issues have no published_at column (see supabase/schema.sql
    // — status + sent_at are the only lifecycle timestamps), so created_at
    // is the only timestamp available, not just a fallback.
    ...newsletterIssues.map(
      (issue): LatestItem => ({
        id: issue.id,
        type: "newsletter",
        title: issue.title,
        description: issue.subtitle,
        date: issue.created_at,
        href: `/newsletter/${issue.slug}`,
      })
    ),
  ];

  return items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
