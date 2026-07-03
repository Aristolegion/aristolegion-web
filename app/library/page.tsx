import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { publications } from "@/lib/content/library";

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

export default function LibraryPage() {
  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">The Library</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              The Aristolegion Library
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              A curated collection of research publications, executive
              journals, essays, and intellectual works exploring capability,
              judgment, authority, resilience, and human excellence.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="navy">
        <Container>
          <SectionHeading
            eyebrow="Current Publications"
            title="The Central Publishing Hub"
            tone="navy"
          />

          <ul className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {publications.map((item) => (
              <li key={item.slug}>
                <Card href={`/library/${item.slug}`} tone="navy">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    />
                  </div>
                  <div className="p-6">
                    <Eyebrow className="mb-2">{item.category}</Eyebrow>
                    <h3 className="font-display text-xl font-semibold text-ivory">
                      {item.title}
                    </h3>
                    <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                      {item.excerpt}
                    </p>
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
    </PageShell>
  );
}
