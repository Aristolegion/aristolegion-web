import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { siteMeta } from "@/lib/content/homepage";

export function Hero() {
  return (
    <Section
      id="hero"
      background="navy"
      className="flex min-h-[100dvh] items-center py-0 md:py-0"
    >
      <Container className="py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow className="mb-6">An Intellectual House</Eyebrow>
          <h1 className="font-display text-balance text-5xl font-semibold uppercase tracking-[0.15em] text-ivory md:text-7xl lg:text-8xl">
            {siteMeta.name}
          </h1>
          <Divider className="mx-auto my-8 w-24" />
          <p className="font-display text-balance text-xl italic leading-relaxed text-gold md:text-2xl">
            {siteMeta.motto}
          </p>
          <p className="mx-auto mt-8 max-w-2xl font-body text-base leading-relaxed text-ivory-muted md:text-lg">
            {siteMeta.positioning}
          </p>
          <p className="mt-16 font-body text-xs uppercase tracking-[0.2em] text-ivory-muted">
            Section scaffold — content in Phase 2
          </p>
        </div>
      </Container>
    </Section>
  );
}
