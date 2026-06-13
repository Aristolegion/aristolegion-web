import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function ManifestoPreview() {
  return (
    <Section id="manifesto" background="ivory">
      <Container>
        <Eyebrow className="mb-4">The Manifesto</Eyebrow>
        <h2 className="font-display text-balance text-3xl font-semibold text-charcoal md:text-5xl">
          Manifesto Preview
        </h2>
        <p className="mt-6 max-w-2xl font-body text-base text-charcoal/70">
          Section scaffold — manifesto excerpt and pull quote in Phase 2.
        </p>
      </Container>
    </Section>
  );
}
