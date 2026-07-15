import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { innerCircleAudience } from "@/lib/content/innerCircleAudience";
import { innerCirclePrinciples } from "@/lib/content/innerCirclePrinciples";

export const metadata: Metadata = {
  title: "Inner Circle — Aristolegion",
  description:
    "The Aristolegion Inner Circle is an emerging community for individuals exploring judgment, capability, leadership, and the future of human potential. Membership is by application, not subscription.",
  alternates: {
    canonical: "https://aristolegion.com/inner-circle",
  },
  openGraph: {
    title: "The Aristolegion Inner Circle",
    description:
      "An emerging community for individuals exploring judgment, capability, leadership, and the future of human potential.",
    type: "website",
    images: ["/images/crest.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Aristolegion Inner Circle",
    description:
      "An emerging community for individuals exploring judgment, capability, leadership, and the future of human potential.",
    images: ["/images/crest.png"],
  },
};

const FUTURE_CIRCLE_ITEMS = [
  "Future Intelligence Briefings",
  "Framework Discussions",
  "Research Conversations",
  "Member Reflections",
];

export default function InnerCirclePage() {
  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">Inner Circle</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              A Private Circle for Independent Thinkers
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              An emerging community for individuals exploring judgment,
              capability, leadership, and the future of human potential.
            </p>
            <div className="mt-10">
              <Button href="/inner-circle/apply" variant="primary">
                Request Consideration
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <SectionHeading
            eyebrow="The Invitation"
            title="Beyond Consumption. Toward Understanding."
            tone="ivory"
          />
          <article className="mx-auto mt-12 max-w-[68ch]">
            <ReadingSection
              dropCap
              paragraphs={["Information has become infinite."]}
              quote="The challenge ahead is not accessing more knowledge — it is developing the judgment to understand what matters."
            />
            <ReadingSection
              paragraphs={[
                "The Aristolegion Inner Circle exists for those committed to deeper thinking, continuous learning, and meaningful contribution.",
              ]}
            />
          </article>
        </Container>
      </Section>

      <Section background="navy">
        <Container>
          <SectionHeading
            eyebrow="Who It Is For"
            title="Built For The Curious Few"
            tone="navy"
          />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {innerCircleAudience.map((audience) => (
              <li key={audience.number}>
                <Card tone="navy" className="p-6">
                  <span className="font-display text-2xl font-semibold text-gold">
                    {audience.number}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ivory">
                    {audience.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                    {audience.description}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <SectionHeading
            eyebrow="Founding Principles"
            title="The Standards We Value"
            tone="ivory"
          />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {innerCirclePrinciples.map((principle) => (
              <li key={principle.number}>
                <Card tone="ivory" className="p-6">
                  <span className="font-display text-2xl font-semibold text-gold">
                    {principle.number}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-charcoal">
                    {principle.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                    {principle.description}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-balance text-3xl font-semibold text-ivory md:text-4xl">
              The Future Circle
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-ivory-muted">
              As Aristolegion evolves, the Inner Circle will become a space
              for curated discussions, intelligence briefings, frameworks,
              and conversations around capability and leadership.
            </p>
          </div>
          <ul className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            {FUTURE_CIRCLE_ITEMS.map((item) => (
              <li key={item}>
                <Card tone="navy" className="p-6">
                  <Eyebrow variant="muted" className="mb-2">
                    Coming Soon
                  </Eyebrow>
                  <h3 className="font-display text-lg font-semibold text-ivory">
                    {item}
                  </h3>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow className="mb-4">Application</Eyebrow>
            <h2 className="font-display text-balance text-3xl font-semibold text-charcoal md:text-4xl">
              Request Consideration
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-charcoal/70">
              The founding circle is being shaped carefully around
              curiosity, contribution, and commitment to learning.
            </p>
            <div className="mt-10">
              <Button href="/inner-circle/apply" variant="primary">
                Request Consideration
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
