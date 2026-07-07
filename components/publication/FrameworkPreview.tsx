import { Fragment } from "react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { PublicationFrameworkPreview } from "@/lib/content/types";

interface FrameworkPreviewProps {
  framework?: PublicationFrameworkPreview;
}

// Only rendered when a publication has curated framework data — most
// publications won't, and that's expected, not an error state.
export function FrameworkPreview({ framework }: FrameworkPreviewProps) {
  if (!framework) return null;

  return (
    <Section background="navy">
      <Container>
        <Eyebrow className="mb-6 text-center">Framework Preview</Eyebrow>
        <Card tone="navy" className="mx-auto max-w-md p-8 text-center md:p-12">
          <h3 className="font-display text-xl font-semibold text-ivory">{framework.title}</h3>
          <div className="mt-8 flex flex-col items-center gap-3">
            {framework.steps.map((step, index) => (
              <Fragment key={step}>
                <span className="font-body text-sm font-medium uppercase tracking-[0.15em] text-ivory">
                  {step}
                </span>
                {index < framework.steps.length - 1 && (
                  <span className="text-gold" aria-hidden="true">
                    ↓
                  </span>
                )}
              </Fragment>
            ))}
          </div>
        </Card>
      </Container>
    </Section>
  );
}
