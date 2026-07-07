import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { essays as staticEssays } from "@/lib/content/essays";
import { publications as staticPublications } from "@/lib/content/library";
import { supabaseSelect } from "@/lib/supabase";
import type { Essay as HostedEssay, Publication as HostedPublication } from "@/lib/sanctum/types";

const RELATED_LIMIT = 3;

interface RelatedItem {
  key: string;
  href: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
}

interface RelatedIntelligenceProps {
  currentSlug: string;
}

// Draws only from real, published data — other Sanctum-hosted publications,
// the static publications list, and essays (hosted + static) — so this can
// never link to an unpublished or fabricated item. Excludes the current
// publication by slug. Degrades to nothing rendered if no related content
// is available, matching the rest of the site's pattern for empty CMS
// sections (e.g. LatestIntelligence).
export async function RelatedIntelligence({ currentSlug }: RelatedIntelligenceProps) {
  const items: RelatedItem[] = [];

  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      for (const publication of result.data) {
        if (publication.slug === currentSlug) continue;
        items.push({
          key: `publication-${publication.id}`,
          href: `/library/${publication.slug}`,
          category: publication.category,
          title: publication.title,
          excerpt: publication.description,
          date: publication.published_at ?? publication.created_at,
        });
      }
    } else {
      console.error("RELATED INTELLIGENCE FETCH ERROR:", {
        source: "publications",
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("RELATED INTELLIGENCE FETCH ERROR:", { source: "publications", error });
  }

  for (const publication of staticPublications) {
    if (publication.slug === currentSlug) continue;
    items.push({
      key: `publication-${publication.slug}`,
      href: `/library/${publication.slug}`,
      category: publication.category,
      title: publication.title,
      excerpt: publication.excerpt,
      date: publication.publishDate,
    });
  }

  try {
    const result = await supabaseSelect<HostedEssay>("essays", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      for (const essay of result.data) {
        items.push({
          key: `essay-${essay.id}`,
          href: `/essays/${essay.slug}`,
          category: "Essay",
          title: essay.title,
          excerpt: essay.excerpt,
          date: essay.published_at ?? essay.created_at,
        });
      }
    } else {
      console.error("RELATED INTELLIGENCE FETCH ERROR:", {
        source: "essays",
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("RELATED INTELLIGENCE FETCH ERROR:", { source: "essays", error });
  }

  for (const essay of staticEssays) {
    items.push({
      key: `essay-${essay.slug}`,
      href: `/essays/${essay.slug}`,
      category: essay.category,
      title: essay.title,
      excerpt: essay.excerpt,
      date: essay.publishDate,
    });
  }

  const related = items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RELATED_LIMIT);

  if (related.length === 0) return null;

  return (
    <Section background="navy">
      <Container>
        <Eyebrow className="mb-4">Continue Exploring</Eyebrow>
        <h2 className="font-display text-balance text-2xl font-semibold text-ivory md:text-3xl">
          Related Intelligence
        </h2>
        <ul className="mt-10 grid gap-8 md:grid-cols-3">
          {related.map((item) => (
            <li key={item.key}>
              <Card href={item.href} tone="navy" className="p-6">
                <Eyebrow className="mb-2">{item.category}</Eyebrow>
                <h3 className="font-display text-lg font-semibold text-ivory">{item.title}</h3>
                <p className="mt-3 line-clamp-3 font-body text-sm leading-relaxed text-ivory-muted">
                  {item.excerpt}
                </p>
                <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                  Explore →
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
