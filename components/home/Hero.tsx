import Image from "next/image";
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
      className="flex items-center py-0 md:min-h-[100dvh] md:py-0"
    >
      <Container className="py-16 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/crest-transparent.png"
              alt="Aristolegion crest"
              width={220}
              height={220}
              priority
              className="h-20 w-20 md:h-24 md:w-24"
            />
          </div>
          <Eyebrow className="mb-6">An Independent Intellectual Institution</Eyebrow>
          <h1 className="font-display text-balance text-4xl font-bold uppercase tracking-[0.06em] text-ivory md:text-7xl md:tracking-[0.15em] lg:text-8xl">
            {siteMeta.name}
          </h1>
          <Divider className="mx-auto my-6 w-24 md:my-8" />
          <p className="font-display text-balance text-xl italic leading-relaxed text-gold md:text-2xl">
            {siteMeta.motto}
          </p>
          <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-ivory-muted md:mt-8 md:text-lg">
            {siteMeta.positioning}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row md:mt-12">
            <Button href="#library" variant="primary">
              Explore the Library
            </Button>
            <Button href="/manifesto" variant="secondary">
              Read the Manifesto
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
