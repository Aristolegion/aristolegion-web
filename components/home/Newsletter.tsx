import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Newsletter() {
  return (
    <Section id="newsletter" background="navy">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            eyebrow="The Newsletter"
            title="Dispatches on Judgment, Capability, and Human Excellence"
            description="Occasional dispatches from Aristolegion — new publications, essays, and frameworks, sent directly, with nothing to scroll past."
            tone="navy"
          />
          <div className="mt-8">
            <NewsletterSignup tone="navy" />
          </div>
        </div>
      </Container>
    </Section>
  );
}
