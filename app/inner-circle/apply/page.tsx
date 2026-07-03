import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { ApplicationForm } from "@/components/inner-circle/ApplicationForm";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Apply to the Inner Circle — Aristolegion",
  description:
    "Begin your application to the Aristolegion Inner Circle, an application-based cohort for judgment, capability, and leadership.",
  openGraph: {
    title: "Apply to the Inner Circle — Aristolegion",
    description:
      "Begin your application to the Aristolegion Inner Circle, an application-based cohort for judgment, capability, and leadership.",
    type: "website",
    images: ["/images/crest.png"],
  },
};

export default function InnerCircleApplyPage() {
  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">The Inner Circle</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl">
              Application
            </h1>
            <p className="mt-6 font-body text-lg leading-relaxed text-ivory-muted">
              Membership is by application, not subscription. Please answer
              each question thoughtfully — applications are reviewed
              individually, not scored automatically.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <ApplicationForm />
        </Container>
      </Section>
    </PageShell>
  );
}
