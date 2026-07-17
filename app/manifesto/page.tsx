import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { manifestoSections as staticManifestoSections } from "@/lib/content/manifesto";
import type { PublicationSection } from "@/lib/content/types";
import { supabaseSelect } from "@/lib/supabase";

interface HostedManifesto {
  id: string;
  slug: string;
  title: string;
  sections: PublicationSection[];
  status: string;
  created_at: string;
  updated_at: string;
}

// STAGED DEPLOYMENT (ES-008B) — mirrors ES-008A's Framework-shelf pattern
// (app/library/page.tsx's getFrameworks()). As of this writing, migration
// 0007_promote_manifesto.sql is merged but NOT YET APPLIED to production.
// Cutting straight to the DB with no fallback would render this page
// empty for however long it takes an operator to apply that migration —
// a real, user-visible regression. Per EDR-001 ("static files are a
// transitional compatibility layer... retired after migration and
// cutover"), retirement happens after cutover is verified, not merely
// after the migration is authored — so this queries the DB first, and
// falls back to the static `manifestoSections` array
// (lib/content/manifesto.ts) only if that query fails or returns no row.
// Production behavior is therefore unchanged until 0007 is applied; the
// moment the DB has a row, this starts using it automatically, with no
// further deploy required.
//
// TODO(ES-008B): remove this fallback (and lib/content/manifesto.ts's
// `manifestoSections` array) once migration 0007 is applied to production
// and verified. Per EDR-001, the database becomes the canonical knowledge
// store only after successful migration and verification — not merely
// after merge.
async function getManifestoSections(): Promise<PublicationSection[]> {
  try {
    const result = await supabaseSelect<HostedManifesto>("manifesto", {
      filter: { status: "eq.published" },
    });

    if (result.ok && result.data.length > 0) {
      return result.data[0].sections;
    }

    if (!result.ok) {
      console.error("MANIFESTO FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("MANIFESTO FETCH ERROR:", error);
  }

  return staticManifestoSections;
}

export const metadata: Metadata = {
  title: "Manifesto — Aristolegion",
  description:
    "The philosophy, principles, and purpose behind Aristolegion — an independent intellectual institution dedicated to judgment, capability, and human excellence.",
  alternates: {
    canonical: "https://aristolegion.com/manifesto",
  },
  openGraph: {
    title: "The Aristolegion Manifesto",
    description:
      "The philosophy, principles, and purpose behind Aristolegion — an independent intellectual institution dedicated to judgment, capability, and human excellence.",
    type: "article",
    images: ["/images/crest.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Aristolegion Manifesto",
    description:
      "The philosophy, principles, and purpose behind Aristolegion — an independent intellectual institution dedicated to judgment, capability, and human excellence.",
    images: ["/images/crest.png"],
  },
};

// See app/library/page.tsx / app/essays/[slug]/page.tsx for why DB-backed
// routes in this codebase are force-dynamic: combining static rendering
// with an on-demand no-store fetch crashes in this Next.js build instead
// of falling back to SSR gracefully.
export const dynamic = "force-dynamic";

export default async function ManifestoPage() {
  const manifestoSections = await getManifestoSections();

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">The Manifesto</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              A Philosophy of Judgment and Capability
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              The principles, purpose, and institutional philosophy behind
              Aristolegion.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <article className="mx-auto max-w-[68ch]">
            {manifestoSections.map((section, index) => (
              <ReadingSection
                key={index}
                {...section}
                dropCap={index === 0}
              />
            ))}
          </article>

          <div className="mx-auto mt-16 max-w-[68ch] border-t border-charcoal/15 pt-12 text-center">
            <Button href="/library" variant="primary">
              Explore the Library
            </Button>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
