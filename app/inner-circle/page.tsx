import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { innerCircleSections } from "@/lib/content/inner-circle";

export const metadata: Metadata = {
  title: "Inner Circle — Aristolegion",
  description:
    "The Aristolegion Inner Circle is an application-based cohort for individuals developing judgment, capability, and leadership. Membership is by application, not subscription.",
  alternates: {
    canonical: "https://aristolegion.com/inner-circle",
  },
  openGraph: {
    title: "The Aristolegion Inner Circle",
    description:
      "An application-based cohort for individuals developing judgment, capability, and leadership. Membership is by application, not subscription.",
    type: "website",
    images: ["/images/crest.png"],
  },
};

export default function InnerCirclePage() {
  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">The Inner Circle</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              An Application-Based Cohort
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              Membership is by application, not subscription — a
              deliberate, selective pathway for those developing judgment,
              capability, and leadership.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <article className="mx-auto max-w-[68ch]">
            {innerCircleSections.map((section, index) => (
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
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow className="mb-4">Application</Eyebrow>
            <h2 className="font-display text-balance text-3xl font-semibold text-ivory md:text-4xl">
              Begin Your Application
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-ivory-muted">
              If the above resonates, the next step is a short application
              — not a sign-up form.
            </p>
            <div className="mt-10">
              <Button href="/inner-circle/apply" variant="primary">
                Apply to the Inner Circle
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
