import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function FeaturedEssays() {
  return (
    <Section id="essays" background="navy">
      <Container>
        <SectionHeading
          eyebrow="From the House"
          title="Featured Essays"
          description="Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work."
          tone="navy"
        />
      </Container>
    </Section>
  );
}
