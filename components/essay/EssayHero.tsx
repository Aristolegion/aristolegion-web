import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Essay } from "@/lib/content/types";

interface EssayHeroProps {
  essay: Essay;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function EssayHero({ essay }: EssayHeroProps) {
  return (
    <Section background="navy">
      <Container>
        <Link
          href="/essays"
          className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
        >
          ← Back to Essays
        </Link>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <Eyebrow className="mb-4">{essay.category}</Eyebrow>
          <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
            {essay.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-display text-xl italic leading-relaxed text-gold">
            {essay.subtitle}
          </p>
          <p className="mt-8 font-body text-sm uppercase tracking-[0.1em] text-ivory-muted">
            {essay.author} · {formatDate(essay.publishDate)} ·{" "}
            {essay.readingTime}
          </p>
        </div>
      </Container>
    </Section>
  );
}
