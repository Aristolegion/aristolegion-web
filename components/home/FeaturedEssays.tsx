import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { essays as staticEssays } from "@/lib/content/essays";
import { supabaseSelect } from "@/lib/supabase";
import type { Essay as HostedEssay } from "@/lib/sanctum/types";

const FEATURED_ESSAY_LIMIT = 3;

interface FeaturedEssayItem {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  sortDate: string;
}

// Mirrors app/essays/page.tsx's static+hosted merge — this section
// previously read only the static `essays` array, which went empty once
// ES-008A promoted all three static essays into the canonical `essays`
// table (supabase/migrations/0006_promote_static_content.sql). Hosted
// essays carry no category column, so they use the same "Essay" label
// app/essays/page.tsx already established for hosted essays.
async function getFeaturedEssays(): Promise<FeaturedEssayItem[]> {
  const hostedItems: FeaturedEssayItem[] = [];

  try {
    const result = await supabaseSelect<HostedEssay>("essays", {
      order: "published_at.desc",
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      for (const essay of result.data) {
        hostedItems.push({
          slug: essay.slug,
          category: "Essay",
          title: essay.title,
          excerpt: essay.excerpt,
          sortDate: essay.published_at ?? essay.created_at,
        });
      }
    } else {
      console.error("HOMEPAGE ESSAYS FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("HOMEPAGE ESSAYS FETCH ERROR:", error);
  }

  const staticItems: FeaturedEssayItem[] = staticEssays.map((essay) => ({
    slug: essay.slug,
    category: essay.category,
    title: essay.title,
    excerpt: essay.excerpt,
    sortDate: essay.publishDate,
  }));

  return [...hostedItems, ...staticItems]
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    .slice(0, FEATURED_ESSAY_LIMIT);
}

export async function FeaturedEssays() {
  const essays = await getFeaturedEssays();

  return (
    <Section id="essays" background="navy">
      <Container>
        <SectionHeading
          eyebrow="From the House"
          title="From the Archive"
          description="Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work."
          tone="navy"
        />

        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {essays.map((essay) => (
            <li key={essay.slug}>
              <Card href={`/essays/${essay.slug}`} tone="navy" className="p-6">
                <Eyebrow className="mb-2">{essay.category}</Eyebrow>
                <h3 className="font-display text-lg font-semibold text-ivory">
                  {essay.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                  {essay.excerpt}
                </p>
                <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                  Read More →
                </span>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/essays"
            className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
          >
            View All Essays →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
