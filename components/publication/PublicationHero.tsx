import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Publication } from "@/lib/content/types";

interface PublicationHeroProps {
  publication: Publication;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PublicationHero({ publication }: PublicationHeroProps) {
  return (
    <Section background="navy">
      <Container>
        <Link
          href="/library"
          className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
        >
          ← Back to the Library
        </Link>

        <div className="mt-10 grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div className="relative aspect-[3/4] overflow-hidden border border-gold-muted md:order-2">
            <Image
              src={publication.coverImage}
              alt={publication.title}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 480px, 100vw"
            />
          </div>
          <div className="md:order-1">
            <Eyebrow className="mb-4">{publication.category}</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              {publication.title}
            </h1>
            <p className="mt-6 max-w-xl font-display text-xl italic leading-relaxed text-gold">
              {publication.subtitle}
            </p>
            <p className="mt-8 font-body text-sm uppercase tracking-[0.1em] text-ivory-muted">
              {publication.author} · {formatDate(publication.publishDate)} ·{" "}
              {publication.readingTime}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
