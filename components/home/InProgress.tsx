import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { inProgressItems } from "@/lib/content/homepage";

export function InProgress() {
  return (
    <Section id="in-progress" background="ivory">
      <Container>
        <SectionHeading
          eyebrow="Active Initiatives"
          title="In Progress"
          description="Frameworks, research, and cohort programs currently under development at Aristolegion."
          tone="ivory"
        />

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {inProgressItems.map((item) => (
            <li key={item.id}>
              <Card tone="ivory" className="p-6">
                <h3 className="font-display text-xl font-semibold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                  {item.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
