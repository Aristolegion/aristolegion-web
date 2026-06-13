import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function InnerCircleInvitation() {
  return (
    <Section id="inner-circle" background="navy">
      <Container>
        <div className="mx-auto max-w-2xl border border-gold-muted bg-navy-elevated p-8 text-center md:p-12">
          <Eyebrow className="mb-4">The Inner Circle</Eyebrow>
          <h2 className="font-display text-balance text-3xl font-semibold text-ivory md:text-4xl">
            An Application-Based Cohort
          </h2>
          <p className="mt-6 font-body text-base leading-relaxed text-ivory-muted">
            Section scaffold — invitation copy and application CTA in Phase 2.
            Membership is by application, not subscription.
          </p>
        </div>
      </Container>
    </Section>
  );
}
