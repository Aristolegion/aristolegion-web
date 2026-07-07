import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ExternalLinkButton } from "@/components/ui/ExternalLinkButton";
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
            description="Receive new Aristolegion intelligence publications, essays, and frameworks exploring judgment, capability, leadership, and the future of work."
            tone="navy"
          />
          <div className="mt-8">
            <NewsletterSignup tone="navy" />
          </div>
          <div className="mt-6">
            <ExternalLinkButton
              href="https://www.linkedin.com/newsletters/aristolegion-7431645810452484097/"
              label="View Newsletter Archive on LinkedIn"
              variant="ghost"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
