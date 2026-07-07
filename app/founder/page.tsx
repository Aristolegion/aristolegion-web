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
import { founder } from "@/lib/content/homepage";
import { founderSections } from "@/lib/content/founder";
import { publications } from "@/lib/content/library";

export const metadata: Metadata = {
  title: "Founder — Aristolegion",
  description:
    "Uday Anshuman, Founder of Aristolegion — founder story, leadership philosophy, and institutional commitment.",
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
};

export default function FounderPage() {
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
              <Eyebrow className="mb-4">The Founder</Eyebrow>
              <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
                {founder.name}
              </h1>
              <p className="mt-2 font-body text-sm font-medium uppercase tracking-[0.1em] text-gold">
                {founder.title}
              </p>
              <div className="mt-6 max-w-xl space-y-4 font-body text-lg leading-relaxed text-ivory-muted">
                {founder.bioParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-10">
                <LinkedInProfileCard />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <article className="mx-auto max-w-[68ch]">
            {founderSections.map((section, index) => (
              <ReadingSection
                key={index}
                {...section}
                dropCap={index === 0}
              />
            ))}
          </article>
        </Container>
      </Section>

      <Section background="navy">
        <Container>
          <Eyebrow className="mb-4">Selected Work</Eyebrow>
          <h2 className="font-display text-balance text-2xl font-semibold text-ivory md:text-3xl">
            Selected Publications
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {publications.map((item) => (
              <li key={item.slug}>
                <Card href={`/library/${item.slug}`} tone="navy">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                  <div className="p-6">
                    <Eyebrow className="mb-2">{item.category}</Eyebrow>
                    <h3 className="font-display text-lg font-semibold text-ivory">
                      {item.title}
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

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">Institutional Commitment</Eyebrow>
            <h2 className="font-display text-balance text-3xl font-semibold text-charcoal md:text-4xl">
              Built to Compound, Not to Trend
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-charcoal/70">
              Aristolegion is built to compound slowly and deliberately — the
              way judgment does, and the way real institutions do. It is not
              optimized for the next quarter, the next feature release, or
              the next campaign. It is intended to outlast any single
              publication, cohort, or news cycle.
            </p>
            <div className="mt-10">
              <Button href="/library" variant="primary">
                Explore the Library
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
