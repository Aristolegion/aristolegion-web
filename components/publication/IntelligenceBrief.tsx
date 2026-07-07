import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface IntelligenceBriefProps {
  paragraphs: string[];
}

export function IntelligenceBrief({ paragraphs }: IntelligenceBriefProps) {
  if (paragraphs.length === 0) return null;

  return (
    <Section background="ivory">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="mb-6">Intelligence Brief</Eyebrow>
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-4 font-display text-2xl leading-snug text-charcoal first:mt-0 md:text-3xl"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
    </Section>
  );
}
