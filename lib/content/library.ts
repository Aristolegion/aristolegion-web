import type { Publication } from "./types";

// "The Glass Partition" formerly listed here was promoted to the
// canonical `publications` table in Supabase (ES-008A,
// supabase/migrations/0006_promote_static_content.sql) per EDR-001. This
// array is empty rather than removed — getPublication below stays in
// place so app/library/[slug]/page.tsx's static-first/DB-fallback routing
// continues to work unchanged.
export const publications: Publication[] = [];

export function getPublication(slug: string): Publication | undefined {
  return publications.find((publication) => publication.slug === slug);
}
