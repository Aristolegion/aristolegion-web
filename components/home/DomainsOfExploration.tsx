import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { domains } from "@/lib/content/homepage";

export function DomainsOfExploration() {
  return (
    <Section id="what-we-study" background="ivory">
      <Container>
        <SectionHeading
          eyebrow="What We Study"
          title="Domains of Exploration"
          description="Aristolegion examines the forces shaping individuals, institutions, and the future of human capability."
          tone="ivory"
        />

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {domains.map((domain) => (
            <li key={domain.number}>
              <Card tone="ivory" className="p-6">
                <span className="font-display text-2xl font-semibold text-gold">
                  {domain.number}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-charcoal">
                  {domain.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                  {domain.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
