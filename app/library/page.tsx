import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { essays } from "@/lib/content/essays";
import { getPublicationDisplayCategory } from "@/lib/content/publicationEnhancements";
import type { Framework } from "@/lib/content/types";
import { resolveCoverImage, supabaseSelect } from "@/lib/supabase";
import type { Essay as HostedEssay, Publication as HostedPublication } from "@/lib/sanctum/types";

// "The Glass Partition" is a Novel, not an Intelligence Journal — it gets
// its own dedicated "Books" shelf below rather than appearing in the
// Latest/Featured/Archive Intelligence tiers those are curated for.
const BOOKS_SLUGS = new Set(["the-glass-partition"]);

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
  twitter: {
    card: "summary_large_image",
    title: "Aristolegion Library | Intelligence Journals & Research",
    description:
      "Explore Aristolegion publications, research frameworks, leadership intelligence essays, and human capability studies.",
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

interface LibraryPublicationCard {
  slug: string;
  title: string;
  category: string;
  description: string;
  coverImage: string | null;
}

async function toLibraryCard(publication: HostedPublication): Promise<LibraryPublicationCard> {
  const cover = await resolveCoverImage(PUBLICATIONS_BUCKET, publication.cover_image_url, COVER_URL_TTL_SECONDS);
  return {
    slug: publication.slug,
    title: publication.title,
    category: getPublicationDisplayCategory(publication.title, publication.category),
    description: publication.description,
    coverImage: cover.url,
  };
}

// Fetches every published hosted publication once (newest first), then
// derives all three Library tiers from that single list — no title
// matching anywhere, so a new Sanctum publication surfaces automatically
// and its Library placement is controlled entirely from the CMS:
//
// 1. Latest Intelligence — the single newest published publication.
// 2. Featured Intelligence — publications flagged `featured` in Sanctum,
//    ordered by `featured_order` ascending (nulls fall back to newest
//    first, i.e. the order they already arrive in from the query).
// 3. Intelligence Archive — everything else, newest first.
//
// BOOKS_SLUGS (e.g. "The Glass Partition") are excluded from all three
// tiers — they get their own dedicated Books shelf instead, so a Novel
// never appears twice on the page under an Intelligence Journal heading.
async function getLibraryPublications(): Promise<{
  latest: LibraryPublicationCard | null;
  featured: LibraryPublicationCard[];
  archive: LibraryPublicationCard[];
  books: LibraryPublicationCard[];
}> {
  let allPublications: HostedPublication[] = [];

  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { status: "eq.published" },
      order: "published_at.desc.nullslast,created_at.desc",
    });

    if (result.ok) {
      allPublications = result.data;
    } else {
      console.error("LIBRARY PUBLICATIONS FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("LIBRARY PUBLICATIONS FETCH ERROR:", error);
  }

  const books: LibraryPublicationCard[] = [];
  for (const publication of allPublications) {
    if (BOOKS_SLUGS.has(publication.slug)) {
      books.push(await toLibraryCard(publication));
    }
  }

  const hostedPublications = allPublications.filter((publication) => !BOOKS_SLUGS.has(publication.slug));

  const latestPublication = hostedPublications[0] ?? null;
  const latest = latestPublication ? await toLibraryCard(latestPublication) : null;

  const featuredSource = hostedPublications
    .filter((publication) => publication.featured)
    .map((publication, index) => ({ publication, index }))
    .sort((a, b) => {
      const orderA = a.publication.featured_order;
      const orderB = b.publication.featured_order;
      if (orderA !== null && orderB !== null) return orderA - orderB;
      if (orderA !== null) return -1;
      if (orderB !== null) return 1;
      return a.index - b.index; // both unordered: preserve newest-first fallback
    })
    .map((entry) => entry.publication);

  const featured: LibraryPublicationCard[] = [];
  for (const publication of featuredSource) {
    featured.push(await toLibraryCard(publication));
  }

  const archive: LibraryPublicationCard[] = [];
  for (const publication of hostedPublications) {
    if (latestPublication && publication.id === latestPublication.id) continue;
    if (publication.featured) continue;
    archive.push(await toLibraryCard(publication));
  }

  return { latest, featured, archive, books };
}

interface LibraryFrameworkCard {
  title: string;
  description: string;
  status: Framework["status"];
}

// Reads from the canonical `frameworks` table (RFC-003 Knowledge Graph
// schema, supabase/migrations/0003_knowledge_graph_schema.sql /
// 0005_graph_bootstrap.sql), per ES-008A and EDR-001. Migrations
// 0003-0007 were applied to and verified in production on 2026-07-24 —
// the static fallback this function previously used during the staged
// deployment window has been removed (see git history for
// getFrameworks() prior to that date if it's ever needed for reference).
async function getFrameworks(): Promise<LibraryFrameworkCard[]> {
  try {
    const result = await supabaseSelect<{ title: string; description: string; status: string }>(
      "frameworks",
      { order: "created_at.asc" }
    );

    if (result.ok) {
      return result.data.map((row) => ({
        title: row.title,
        description: row.description,
        status: row.status as Framework["status"],
      }));
    }

    console.error("LIBRARY FRAMEWORKS FETCH ERROR:", {
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    console.error("LIBRARY FRAMEWORKS FETCH ERROR:", error);
  }

  return [];
}

interface LibraryEssayCard {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
}

// Mirrors app/essays/page.tsx's static+hosted merge — the Essays &
// Briefings shelf here previously read only the static `essays` array, so
// it went silently empty once ES-008A promoted all three static essays
// into the canonical `essays` table. Hosted essays carry no category
// column (see supabase/migrations/0006_promote_static_content.sql's
// header note), so they use the same "Essay" label app/essays/page.tsx
// already established for hosted essays.
async function getLibraryEssays(): Promise<LibraryEssayCard[]> {
  const hostedItems: LibraryEssayCard[] = [];

  try {
    const result = await supabaseSelect<HostedEssay>("essays", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      for (const essay of result.data) {
        hostedItems.push({
          slug: essay.slug,
          category: "Essay",
          title: essay.title,
          excerpt: essay.excerpt,
        });
      }
    } else {
      console.error("LIBRARY ESSAYS FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("LIBRARY ESSAYS FETCH ERROR:", error);
  }

  const staticItems: LibraryEssayCard[] = essays.map((essay) => ({
    slug: essay.slug,
    category: essay.category,
    title: essay.title,
    excerpt: essay.excerpt,
  }));

  return [...hostedItems, ...staticItems];
}

export default async function LibraryPage() {
  const {
    latest: latestIntelligence,
    featured: featuredIntelligence,
    archive: archivePublications,
    books,
  } = await getLibraryPublications();
  const frameworks = await getFrameworks();
  const libraryEssays = await getLibraryEssays();
  const [glassPartition] = books;

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

      {latestIntelligence && (
        <Section id="latest-intelligence" background="navy">
          <Container>
            <SectionHeading
              eyebrow="Latest Intelligence"
              title="The Newest Release"
              description="The most recently published Aristolegion research — surfaced automatically the moment it goes live."
              tone="navy"
            />

            <div className="mx-auto mt-12 max-w-2xl">
              <Card href={`/library/${latestIntelligence.slug}`} tone="navy">
                <div className="relative aspect-[16/9] overflow-hidden bg-charcoal">
                  {latestIntelligence.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={latestIntelligence.coverImage}
                      alt={latestIntelligence.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                      <Eyebrow>{latestIntelligence.category}</Eyebrow>
                    </div>
                  )}
                </div>
                <div className="p-8">
                  <Eyebrow className="mb-2">{latestIntelligence.category}</Eyebrow>
                  <h3 className="font-display text-2xl font-semibold text-ivory md:text-3xl">
                    {latestIntelligence.title}
                  </h3>
                  <p className="mt-4 font-body text-base leading-relaxed text-ivory-muted">
                    {latestIntelligence.description}
                  </p>
                  <span className="mt-6 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                    Explore →
                  </span>
                </div>
              </Card>
            </div>
          </Container>
        </Section>
      )}

      <Section id="featured-intelligence" background="navy">
        <Container>
          <SectionHeading
            eyebrow="Featured Intelligence"
            title="Signature Publications"
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

      {archivePublications.length > 0 && (
        <Section id="intelligence-archive" background="ivory">
          <Container>
            <SectionHeading
              eyebrow="Intelligence Archive"
              title="The Complete Record"
              description="The full, ever-expanding record of Aristolegion intelligence journals and executive research publications, newest first."
              tone="ivory"
            />

            <ul className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {archivePublications.map((item) => (
                <li key={item.slug}>
                  <Card href={`/library/${item.slug}`} tone="ivory">
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
                      <h3 className="font-display text-xl font-semibold text-charcoal">
                        {item.title}
                      </h3>
                      <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                        {item.description}
                      </p>
                      <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                        Explore →
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {frameworks.length > 0 && (
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
      )}

      <Section id="essays-briefings" background="navy">
        <Container>
          <SectionHeading
            eyebrow="Essays & Briefings"
            title="Field Notes"
            description="Short-form intelligence exploring leadership, work, learning, and human performance."
            tone="navy"
          />

          <ul className="mt-12 grid gap-8 md:grid-cols-3">
            {libraryEssays.map((essay) => (
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
                    {glassPartition.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={glassPartition.coverImage}
                        alt={glassPartition.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                        <Eyebrow>Novel</Eyebrow>
                      </div>
                    )}
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
