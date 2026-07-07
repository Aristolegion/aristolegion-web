import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface PublicationHeroProps {
  category: string;
  title: string;
  description: string;
  year: string | null;
  author?: string;
  readingTime?: string;
  coverSrc: string | null;
  coverIsExternal: boolean;
  isDraftPreview?: boolean;
}

export function PublicationHero({
  category,
  title,
  description,
  year,
  author,
  readingTime,
  coverSrc,
  coverIsExternal,
  isDraftPreview = false,
}: PublicationHeroProps) {
  return (
    <Section background="navy">
      <Container>
        <Link
          href="/library"
          className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
        >
          ← Back to the Library
        </Link>

        {isDraftPreview && (
          <p className="mx-auto mt-6 max-w-3xl border border-gold-muted bg-charcoal px-4 py-2 text-center font-body text-xs font-medium uppercase tracking-[0.1em] text-gold">
            Draft Preview — visible only to Sanctum
          </p>
        )}

        <div className="mt-10 grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div className="relative aspect-[3/4] overflow-hidden border border-gold-muted bg-charcoal md:order-2">
            {!coverSrc ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <Eyebrow>{category}</Eyebrow>
              </div>
            ) : coverIsExternal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={coverSrc}
                alt={title}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 480px, 100vw"
              />
            )}
          </div>

          <div className="md:order-1">
            <Eyebrow className="mb-4">{category}</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-xl font-display text-xl italic leading-relaxed text-gold">
              {description}
            </p>
            <p className="mt-8 font-body text-sm uppercase tracking-[0.1em] text-ivory-muted">
              Published by Aristolegion Intelligence
              {year && <> · {year}</>}
            </p>
            {(author || readingTime) && (
              <p className="mt-2 font-body text-sm text-ivory-muted/70">
                {[author, readingTime].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
