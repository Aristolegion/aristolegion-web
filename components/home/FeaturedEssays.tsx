import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { essays } from "@/lib/content/essays";

export function FeaturedEssays() {
  return (
    <Section id="essays" background="navy">
      <Container>
        <SectionHeading
          eyebrow="From the House"
          title="From the Archive"
          description="Ongoing essays developing Aristolegion's intellectual voice — on judgment, capability, leadership, and the future of work."
          tone="navy"
        />

        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {essays.map((essay) => (
            <li key={essay.slug}>
              <Card href={`/essays/${essay.slug}`} tone="navy" className="p-6">
                <Eyebrow className="mb-2">{essay.category}</Eyebrow>
                <h3 className="font-display text-lg font-semibold text-ivory">
                  {essay.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                  {essay.excerpt}
                </p>
                <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                  Read More →
                </span>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/essays"
            className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
          >
            View All Essays →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
