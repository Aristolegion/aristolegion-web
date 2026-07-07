import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { pillars } from "@/lib/content/homepage";

export function SixPillars() {
  return (
    <Section id="six-pillars" background="navy">
      <Container>
        <SectionHeading
          eyebrow="The Framework"
          title="The Six Pillars of Aristolegion"
          tone="navy"
        />

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <li key={pillar.number}>
              <Card tone="navy" className="p-6">
                <span className="font-display text-2xl font-semibold text-gold">
                  {pillar.number}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ivory">
                  {pillar.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                  {pillar.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
