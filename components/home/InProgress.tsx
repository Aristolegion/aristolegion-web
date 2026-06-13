import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { inProgressItems } from "@/lib/content/homepage";

export function InProgress() {
  return (
    <Section id="in-progress" background="ivory">
      <Container>
        <Eyebrow className="mb-4">Active Initiatives</Eyebrow>
        <h2 className="font-display text-balance text-3xl font-semibold text-charcoal md:text-5xl">
          In Progress
        </h2>
        <p className="mt-6 max-w-2xl font-body text-base text-charcoal/70">
          Section scaffold — active intellectual initiatives in Phase 2.
        </p>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {inProgressItems.map((item) => (
            <li
              key={item.id}
              className="border border-gold-muted bg-ivory p-6"
            >
              <h3 className="font-display text-xl font-medium text-charcoal">
                {item.title}
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
