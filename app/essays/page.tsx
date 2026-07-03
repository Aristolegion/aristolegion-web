import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { essays } from "@/lib/content/essays";

export const metadata: Metadata = {
  title: "Essays — Aristolegion",
  description:
    "Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work.",
  openGraph: {
    title: "Essays — Aristolegion",
    description:
      "Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work.",
    type: "website",
    images: ["/images/crest.png"],
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EssaysPage() {
  const [featured, ...rest] = essays;

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">Essays</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              From the House
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              Ongoing essays developing Aristolegion&apos;s intellectual
              voice — on judgment, capability, leadership, and the future of
              work.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <Card
            href={`/essays/${featured.slug}`}
            tone="ivory"
            className="p-8 md:p-12"
          >
            <Eyebrow className="mb-3">{featured.category} · Featured</Eyebrow>
            <h2 className="font-display text-balance text-2xl font-semibold text-charcoal md:text-4xl">
              {featured.title}
            </h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-charcoal/70">
              {featured.excerpt}
            </p>
            <p className="mt-6 font-body text-sm uppercase tracking-[0.1em] text-charcoal/50">
              {formatDate(featured.publishDate)} · {featured.readingTime}
            </p>
            <span className="mt-6 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
              Read More →
            </span>
          </Card>

          {rest.length > 0 && (
            <ul className="mt-10 grid gap-8 md:grid-cols-2">
              {rest.map((essay) => (
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
                      {formatDate(essay.publishDate)} · {essay.readingTime}
                    </p>
                    <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                      Read More →
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </PageShell>
  );
}
