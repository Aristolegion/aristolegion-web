import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface CentralQuestionProps {
  question: string;
}

export function CentralQuestion({ question }: CentralQuestionProps) {
  if (!question) return null;

  return (
    <Section background="navy">
      <Container>
        <Card tone="navy" className="mx-auto max-w-3xl p-8 text-center md:p-12">
          <Eyebrow className="mb-6">The Central Question</Eyebrow>
          <p className="font-display text-balance text-2xl italic leading-snug text-ivory md:text-4xl">
            {question}
          </p>
        </Card>
      </Container>
    </Section>
  );
}
