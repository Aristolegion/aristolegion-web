import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { founder } from "@/lib/content/homepage";

export function FounderPreview() {
  return (
    <Section id="founder" background="ivory">
      <Container>
        <Eyebrow className="mb-4">The Founder</Eyebrow>
        <h2 className="font-display text-balance text-3xl font-semibold text-charcoal md:text-5xl">
          {founder.name}
        </h2>
        <p className="mt-2 font-body text-sm font-medium uppercase tracking-[0.1em] text-gold">
          {founder.title}
        </p>
        <p className="mt-6 max-w-2xl font-body text-base text-charcoal/70">
          Section scaffold — portrait and biography in Phase 2.
        </p>
      </Container>
    </Section>
  );
}
