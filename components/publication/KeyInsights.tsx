import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { PublicationInsight } from "@/lib/content/types";

interface KeyInsightsProps {
  insights: PublicationInsight[];
}

export function KeyInsights({ insights }: KeyInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <Section background="ivory">
      <Container>
        <Eyebrow className="mb-6">Key Intelligence</Eyebrow>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <li key={insight.title}>
              <Card tone="ivory" className="p-6">
                <span className="font-display text-2xl font-semibold text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-charcoal">
                  {insight.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                  {insight.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
