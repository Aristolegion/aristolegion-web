import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
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
          <Eyebrow className="mb-6">An Independent Intellectual Institution</Eyebrow>
          <h1 className="font-display text-balance text-5xl font-bold uppercase tracking-[0.15em] text-ivory md:text-7xl lg:text-8xl">
            {siteMeta.name}
          </h1>
          <Divider className="mx-auto my-8 w-24" />
          <p className="font-display text-balance text-xl italic leading-relaxed text-gold md:text-2xl">
            {siteMeta.motto}
          </p>
          <p className="mx-auto mt-8 max-w-2xl font-body text-base leading-relaxed text-ivory-muted md:text-lg">
            {siteMeta.positioning}
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="#library" variant="primary">
              Explore the Library
            </Button>
            <Button href="#inner-circle" variant="secondary">
              Apply to the Inner Circle
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
