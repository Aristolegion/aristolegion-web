import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { essays } from "@/lib/content/essays";
import { frameworks, publications as staticPublications } from "@/lib/content/library";
import { getPublicationDisplayCategory } from "@/lib/content/publicationEnhancements";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Publication as HostedPublication } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

export const metadata: Metadata = {
  title: "Aristolegion Library | Intelligence Journals & Research",
  description:
    "Explore Aristolegion publications, research frameworks, leadership intelligence essays, and human capability studies.",
  alternates: {
    canonical: "https://aristolegion.com/library",
  },
  openGraph: {
    title: "Aristolegion Library | Intelligence Journals & Research",
    description:
      "Explore Aristolegion publications, research frameworks, leadership intelligence essays, and human capability studies.",
    type: "website",
    images: ["/images/crest.png"],
  },
};

export const dynamic = "force-dynamic";

const CATEGORY_LINKS = [
  { label: "All", href: "#library-hero" },
  { label: "Intelligence Journals", href: "#featured-intelligence" },
  { label: "Frameworks", href: "#frameworks" },
  { label: "Essays", href: "#essays-briefings" },
  { label: "Books", href: "#books" },
];

interface FeaturedIntelligenceItem {
  slug: string;
  title: string;
  category: string;
  description: string;
  coverImage: string | null;
}

// Research-first hierarchy per the content architecture review — a fixed,
// curated pair rather than the full date-sorted publication list. Matches
// hosted Sanctum publications by title; title/category/description here are
// the reviewed page copy, independent of whatever the live record says, so
// a hosted publication is only used as a slug + cover lookup.
const FEATURED_INTELLIGENCE_SLOTS: {
  match: (title: string) => boolean;
  title: string;
  description: string;
}[] = [
  {
    match: (title) => title.includes("capability dividend"),
    title: "Capability Dividend™",
    description:
      "Why capability has become the last remaining competitive advantage in the age of accelerating technology.",
  },
  {
    match: (title) => title.includes("employability fracture"),
    title: "Aristolegion Intelligence Journal — Employability Fracture",
    description:
      "Deconstructing changing talent realities and the imperative for judgment-driven leadership.",
  },
];

async function getFeaturedIntelligence(): Promise<FeaturedIntelligenceItem[]> {
  let hostedPublications: HostedPublication[] = [];

  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      hostedPublications = result.data;
    } else {
      console.error("LIBRARY FEATURED INTELLIGENCE FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("LIBRARY FEATURED INTELLIGENCE FETCH ERROR:", error);
  }

  const usedIds = new Set<string>();
  const featured: FeaturedIntelligenceItem[] = [];

  for (const slot of FEATURED_INTELLIGENCE_SLOTS) {
    const match = hostedPublications.find(
      (publication) =>
        !usedIds.has(publication.id) && slot.match(publication.title.toLowerCase())
    );

    if (!match) continue;
    usedIds.add(match.id);

    const coverUrl = match.cover_image_url
      ? await supabaseCreateSignedUrl(
          PUBLICATIONS_BUCKET,
          match.cover_image_url,
          COVER_URL_TTL_SECONDS
        )
      : null;

    featured.push({
      slug: match.slug,
      title: slot.title,
      category: getPublicationDisplayCategory(match.title, match.category),
      description: slot.description,
      coverImage: coverUrl?.ok ? coverUrl.url : null,
    });
  }

  return featured;
}

export default async function LibraryPage() {
  const featuredIntelligence = await getFeaturedIntelligence();
  const glassPartition = staticPublications.find(
    (publication) => publication.slug === "the-glass-partition"
  );

  return (
    <PageShell>
      <Section id="library-hero" background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">The Library</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              The Aristolegion Library
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              The central archive of Aristolegion intelligence — housing
              research publications, proprietary frameworks, essays, and
              intellectual works exploring capability, judgment, leadership,
              and the future of human systems.
            </p>
          </div>
        </Container>
      </Section>

      <div className="border-y border-gold-muted bg-navy">
        <Container className="py-6">
          <nav aria-label="Library categories">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {CATEGORY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="font-body text-xs font-medium uppercase tracking-[0.15em] text-ivory-muted transition-colors duration-200 hover:text-gold"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>

      <Section id="featured-intelligence" background="navy">
        <Container>
          <SectionHeading
            eyebrow="Featured Intelligence"
            title="Intelligence Archive"
            description="Selected research publications and executive briefings from Aristolegion exploring the forces shaping individuals, organizations, and the future of work."
            tone="navy"
          />

          {featuredIntelligence.length > 0 && (
            <ul className="mt-12 grid gap-8 md:grid-cols-2">
              {featuredIntelligence.map((item) => (
                <li key={item.slug}>
                  <Card href={`/library/${item.slug}`} tone="navy">
                    <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
                      {item.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                          <Eyebrow>{item.category}</Eyebrow>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <Eyebrow className="mb-2">{item.category}</Eyebrow>
                      <h3 className="font-display text-xl font-semibold text-ivory">
                        {item.title}
                      </h3>
                      <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                        {item.description}
                      </p>
                      <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                        Explore →
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      <Section id="frameworks" background="ivory">
        <Container>
          <SectionHeading
            eyebrow="Proprietary Frameworks"
            title="Capability Systems"
            description="Original Aristolegion models examining how capability, judgment, and human advantage compound over time."
            tone="ivory"
          />

          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {frameworks.map((framework) => (
              <li key={framework.title}>
                <Card tone="ivory" className="p-6">
                  <p
                    className={`font-body text-xs font-medium uppercase tracking-[0.15em] ${
                      framework.status === "Published" ? "text-gold" : "text-charcoal/60"
                    }`}
                  >
                    {framework.status}
                  </p>
                  <h3 className="mt-3 font-display text-lg font-semibold text-charcoal">
                    {framework.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                    {framework.description}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section id="essays-briefings" background="navy">
        <Container>
          <SectionHeading
            eyebrow="Essays & Briefings"
            title="Field Notes"
            description="Short-form intelligence exploring leadership, work, learning, and human performance."
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
        </Container>
      </Section>

      {glassPartition && (
        <Section id="books" background="ivory">
          <Container>
            <SectionHeading
              eyebrow="Books From the House"
              title="Long-form Works"
              tone="ivory"
            />

            <ul className="mt-12 grid gap-8 sm:max-w-sm">
              <li>
                <Card href={`/library/${glassPartition.slug}`} tone="ivory">
                  <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
                    <Image
                      src={glassPartition.coverImage}
                      alt={glassPartition.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width: 640px) 384px, 100vw"
                    />
                  </div>
                  <div className="p-6">
                    <Eyebrow className="mb-2">Novel</Eyebrow>
                    <h3 className="font-display text-xl font-semibold text-charcoal">
                      {glassPartition.title}
                    </h3>
                    <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                      A philosophical exploration of invisible barriers,
                      ambition, identity, and institutions.
                    </p>
                    <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                      Explore →
                    </span>
                  </div>
                </Card>
              </li>
            </ul>
          </Container>
        </Section>
      )}
    </PageShell>
  );
}
