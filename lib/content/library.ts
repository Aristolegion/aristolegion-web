import type { Framework, Publication } from "./types";

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

// TRANSITIONAL — ES-008A staged deployment. The canonical `frameworks`
// table (supabase/migrations/0003_knowledge_graph_schema.sql /
// 0005_graph_bootstrap.sql) is merged but not yet applied to production.
// app/library/page.tsx's getFrameworks() queries the DB first and falls
// back to this array only if that query fails or returns zero rows, so
// the Framework shelf keeps rendering today's content with no visible
// regression until the migrations are applied. Per EDR-001, this array is
// transitional: remove it (and the fallback branch in getFrameworks())
// once 0003-0006 have been applied to production and verified — do not
// remove it before then. Values are identical, verbatim, to what
// 0005_graph_bootstrap.sql inserts into the `frameworks` table.
export const frameworks: Framework[] = [
  {
    title: "Capability Dividend™",
    description:
      "A framework exploring the transition from knowledge accumulation to capability creation.",
    status: "Published",
  },
  {
    title: "Capability Flywheel™",
    description:
      "How learning, judgment, execution, and reflection create compounding professional growth.",
    status: "Research Development",
  },
  {
    title: "Judgment Capital™",
    description:
      "Understanding judgment as a scarce advantage in an information-abundant world.",
    status: "Research Development",
  },
];
