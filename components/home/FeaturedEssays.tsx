import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function FeaturedEssays() {
  return (
    <Section id="essays" background="navy">
      <Container>
        <Eyebrow className="mb-4">From the House</Eyebrow>
        <h2 className="font-display text-balance text-3xl font-semibold text-ivory md:text-5xl">
          Featured Essays
        </h2>
        <p className="mt-6 max-w-2xl font-body text-base text-ivory-muted">
          Section scaffold — editorial essay grid in Phase 2.
        </p>
      </Container>
    </Section>
  );
}
