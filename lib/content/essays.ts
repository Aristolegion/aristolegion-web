import type { Essay } from "./types";

// The three essays formerly listed here — "Judgment in the Age of
// Information Abundance," "Capability Over Credentials," and "The Return
// of Deep Work" — were promoted to the canonical `essays` table in
// Supabase (ES-008A, supabase/migrations/0006_promote_static_content.sql)
// per EDR-001. This array is empty rather than removed: it remains the
// escape hatch for any future essay that needs to ship before the CMS is
// ready, and getEssay/getRelatedEssays below stay in place so
// app/essays/[slug]/page.tsx's static-first/DB-fallback routing continues
// to work unchanged for both cases.
export const essays: Essay[] = [];

export function getEssay(slug: string): Essay | undefined {
  return essays.find((essay) => essay.slug === slug);
}

export function getRelatedEssays(slug: string, limit = 3): Essay[] {
  return essays.filter((essay) => essay.slug !== slug).slice(0, limit);
}
