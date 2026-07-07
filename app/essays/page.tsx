import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { essays as staticEssays } from "@/lib/content/essays";
import { essayCollections } from "@/lib/content/essayCollections";
import { supabaseSelect } from "@/lib/supabase";
import type { Essay as HostedEssay } from "@/lib/sanctum/types";

export const metadata: Metadata = {
  title: "Essays — Aristolegion",
  description:
    "Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work.",
  alternates: {
    canonical: "https://aristolegion.com/essays",
  },
  openGraph: {
    title: "Essays — Aristolegion",
    description:
      "Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work.",
    type: "website",
    images: ["/images/crest.png"],
  },
};

export const dynamic = "force-dynamic";

interface EssayCardItem {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  sortDate: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function EssaysPage() {
  let hostedItems: EssayCardItem[] = [];

  try {
    const hostedResult = await supabaseSelect<HostedEssay>("essays", {
      order: "published_at.desc",
      filter: { status: "eq.published" },
    });

    if (hostedResult.ok) {
      hostedItems = hostedResult.data.map((essay) => ({
        slug: essay.slug,
        title: essay.title,
        category: "Essay",
        excerpt: essay.excerpt,
        sortDate: essay.published_at ?? essay.created_at,
      }));
    } else {
      console.error("ESSAY CMS ERROR:", {
        source: "fetch",
        status: hostedResult.status,
        message: hostedResult.message,
      });
    }
  } catch (error) {
    console.error("ESSAY CMS ERROR:", { source: "fetch", error });
  }

  const staticItems: EssayCardItem[] = staticEssays.map((essay) => ({
    slug: essay.slug,
    title: essay.title,
    category: essay.category,
    excerpt: essay.excerpt,
    sortDate: essay.publishDate,
  }));

  const items = [...hostedItems, ...staticItems].sort(
    (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
  );

  const [featured] = items;

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">Essays</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              Field Notes &amp; Essays
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              Observations and essays exploring judgment, capability,
              leadership, human systems, and the evolving nature of work.
            </p>
          </div>
        </Container>
      </Section>

      {featured && (
        <Section background="ivory">
          <Container>
            <SectionHeading
              eyebrow="Featured Essay"
              title="Current Thinking"
              tone="ivory"
            />
            <div className="mt-12">
              <Card href={`/essays/${featured.slug}`} tone="ivory" className="p-8 md:p-12">
                <Eyebrow className="mb-3">{featured.category}</Eyebrow>
                <h3 className="font-display text-balance text-2xl font-semibold text-charcoal md:text-4xl">
                  {featured.title}
                </h3>
                <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-charcoal/70">
                  {featured.excerpt}
                </p>
                <p className="mt-6 font-body text-sm uppercase tracking-[0.1em] text-charcoal/50">
                  {formatDate(featured.sortDate)}
                </p>
                <span className="mt-6 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                  Read Essay →
                </span>
              </Card>
            </div>
          </Container>
        </Section>
      )}

      <Section background="navy">
        <Container>
          <SectionHeading
            eyebrow="Collections"
            title="Areas of Inquiry"
            description="Essays are organized around the core questions shaping individuals, organizations, and the future of capability."
            tone="navy"
          />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {essayCollections.map((collection) => (
              <li key={collection.number}>
                <Card tone="navy" className="p-6">
                  <span className="font-display text-2xl font-semibold text-gold">
                    {collection.number}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ivory">
                    {collection.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                    {collection.description}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {items.length > 0 && (
        <Section background="ivory">
          <Container>
            <SectionHeading eyebrow="Archive" title="All Essays" tone="ivory" />
            <ul className="mt-12 grid gap-8 md:grid-cols-2">
              {items.map((essay) => (
                <li key={essay.slug}>
                  <Card href={`/essays/${essay.slug}`} tone="ivory" className="p-6">
                    <Eyebrow className="mb-2">{essay.category}</Eyebrow>
                    <h3 className="font-display text-xl font-semibold text-charcoal">
                      {essay.title}
                    </h3>
                    <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                      {essay.excerpt}
                    </p>
                    <p className="mt-4 font-body text-xs uppercase tracking-[0.1em] text-charcoal/50">
                      {formatDate(essay.sortDate)}
                    </p>
                    <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                      Read More →
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Join the Newsletter</Eyebrow>
            <h2 className="font-display text-balance text-2xl font-semibold text-ivory md:text-3xl">
              Continue Exploring Human Capability
            </h2>
            <p className="mt-6 font-body text-base leading-relaxed text-ivory-muted">
              Receive new Aristolegion essays, intelligence publications, and
              frameworks exploring judgment, leadership, and the future of
              work.
            </p>
            <div className="mt-8">
              <NewsletterSignup tone="navy" />
            </div>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
