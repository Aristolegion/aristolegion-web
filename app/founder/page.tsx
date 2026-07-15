import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { LinkedInProfileCard } from "@/components/LinkedInProfileCard";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { founder } from "@/lib/content/homepage";
import { founderResearchInterests } from "@/lib/content/founderResearchInterests";
import { publications as staticPublications } from "@/lib/content/library";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Publication as HostedPublication } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

export const metadata: Metadata = {
  title: "Founder — Aristolegion",
  description:
    "Uday Anshuman, Founder of Aristolegion — the origin, perspective, and questions behind the institution.",
  authors: [{ name: "Uday Anshuman" }],
  alternates: {
    canonical: "https://aristolegion.com/founder",
  },
  openGraph: {
    title: "Uday Anshuman — Founder, Aristolegion",
    description: founder.bio,
    type: "profile",
    images: ["/images/founder-uday.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uday Anshuman — Founder, Aristolegion",
    description: founder.bio,
    images: ["/images/founder-uday.png"],
  },
};

export const dynamic = "force-dynamic";

interface SelectedWork {
  slug: string;
  title: string;
  type: string;
  coverImage: string | null;
}

// Curated, in this order — matched against live Sanctum publications by
// title (same pattern already used on the homepage and /library) so this
// never duplicates or drifts from the real publication record. Falls back
// to whichever entries are actually available rather than hardcoding all
// three.
const HOSTED_SELECTED_WORKS: { match: (title: string) => boolean; title: string; type: string }[] = [
  {
    match: (title) => title.includes("capability dividend"),
    title: "Capability Dividend™",
    type: "Framework",
  },
  {
    match: (title) => title.includes("employability fracture"),
    title: "Employability Fracture",
    type: "Intelligence Journal",
  },
];

async function getSelectedWorks(): Promise<SelectedWork[]> {
  const works: SelectedWork[] = [];

  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      for (const slot of HOSTED_SELECTED_WORKS) {
        const match = result.data.find((publication) =>
          slot.match(publication.title.toLowerCase())
        );
        if (!match) continue;

        const coverUrl = match.cover_image_url
          ? await supabaseCreateSignedUrl(
              PUBLICATIONS_BUCKET,
              match.cover_image_url,
              COVER_URL_TTL_SECONDS
            )
          : null;

        works.push({
          slug: match.slug,
          title: slot.title,
          type: slot.type,
          coverImage: coverUrl?.ok ? coverUrl.url : null,
        });
      }
    } else {
      console.error("FOUNDER SELECTED WORKS FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("FOUNDER SELECTED WORKS FETCH ERROR:", error);
  }

  const glassPartition = staticPublications.find(
    (publication) => publication.slug === "the-glass-partition"
  );

  if (glassPartition) {
    works.push({
      slug: glassPartition.slug,
      title: glassPartition.title,
      type: "Book",
      coverImage: glassPartition.coverImage,
    });
  }

  return works;
}

export default async function FounderPage() {
  const selectedWorks = await getSelectedWorks();

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
            <div className="relative aspect-[4/5] overflow-hidden border border-gold-muted md:order-2">
              <Image
                src="/images/founder-uday.png"
                alt={founder.name}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 480px, 100vw"
              />
            </div>
            <div className="md:order-1">
              <Eyebrow className="mb-4">Founder</Eyebrow>
              <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
                {founder.name}
              </h1>
              <p className="mt-2 font-body text-sm font-medium uppercase tracking-[0.1em] text-gold">
                {founder.title}
              </p>
              <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-ivory-muted">
                Exploring the intersection of human capability, learning
                systems, leadership intelligence, and the future of work.
              </p>
              <div className="mt-10">
                <LinkedInProfileCard />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <SectionHeading eyebrow="Origin" title="Why Aristolegion Exists" tone="ivory" />
          <article className="mx-auto mt-12 max-w-[68ch]">
            <ReadingSection
              dropCap
              paragraphs={["Aristolegion was created from a simple observation:"]}
              quote="Access to information has never been greater, yet the ability to transform information into judgment, capability, and meaningful action remains increasingly rare."
            />
            <ReadingSection
              paragraphs={[
                "The institution explores the capabilities individuals and organizations need when knowledge alone is no longer enough.",
              ]}
            />
          </article>
        </Container>
      </Section>

      <Section background="navy">
        <Container>
          <SectionHeading
            eyebrow="Practitioner Perspective"
            title="Built From Observation"
            tone="navy"
          />
          <div className="mx-auto mt-12 max-w-[68ch] space-y-6 font-body text-lg leading-relaxed text-ivory-muted">
            <p>
              Through work across talent acquisition, learning, and
              capability development, Uday observed the changing relationship
              between skills, performance, and human potential.
            </p>
            <p>
              These observations became the foundation for
              Aristolegion&apos;s exploration of capability, judgment, and
              lifelong development.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <SectionHeading
            eyebrow="Areas of Study"
            title="Questions Behind The Work"
            tone="ivory"
          />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {founderResearchInterests.map((interest) => (
              <li key={interest.number}>
                <Card tone="ivory" className="p-6">
                  <span className="font-display text-2xl font-semibold text-gold">
                    {interest.number}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-charcoal">
                    {interest.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                    {interest.description}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {selectedWorks.length > 0 && (
        <Section background="navy">
          <Container>
            <SectionHeading eyebrow="Selected Works" title="Published Thinking" tone="navy" />
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {selectedWorks.map((work) => (
                <li key={work.slug}>
                  <Card href={`/library/${work.slug}`} tone="navy">
                    <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
                      {work.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={work.coverImage}
                          alt={work.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                          <Eyebrow>{work.type}</Eyebrow>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <Eyebrow className="mb-2">{work.type}</Eyebrow>
                      <h3 className="font-display text-lg font-semibold text-ivory">
                        {work.title}
                      </h3>
                      <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
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

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-balance text-3xl font-semibold text-charcoal md:text-4xl">
              Continue Exploring Aristolegion
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-charcoal/70">
              Explore the research, essays, and frameworks examining
              capability, leadership, and human systems.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/library" variant="primary">
                Explore Library
              </Button>
              <Button href="/essays" variant="secondary">
                Read Essays
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
