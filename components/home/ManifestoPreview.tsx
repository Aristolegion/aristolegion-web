import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ManifestoPreview() {
  return (
    <Section id="manifesto" background="ivory">
      <Container>
        <SectionHeading
          eyebrow="The Manifesto"
          title="A Philosophy of Judgment and Capability"
          description="Aristolegion exists to help ambitious individuals develop judgment, capability, and character in an age of accelerating change — through research, publications, essays, frameworks, and carefully designed communities."
          tone="ivory"
        />
        <div className="mt-10">
          <Link
            href="/manifesto"
            className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-navy"
          >
            Read the Manifesto →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
