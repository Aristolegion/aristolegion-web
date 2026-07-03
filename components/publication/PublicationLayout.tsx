import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PublicationHero } from "@/components/publication/PublicationHero";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { getRelatedPublications } from "@/lib/content/library";
import type { Publication } from "@/lib/content/types";

interface PublicationLayoutProps {
  publication: Publication;
}

export function PublicationLayout({ publication }: PublicationLayoutProps) {
  const related = getRelatedPublications(publication.slug);

  return (
    <PageShell>
      <PublicationHero publication={publication} />

      <Section background="ivory">
        <Container>
          <article className="mx-auto max-w-[68ch]">
            {publication.sections.map((section, index) => (
              <ReadingSection key={index} {...section} dropCap={index === 0} />
            ))}
          </article>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section background="navy">
          <Container>
            <Eyebrow className="mb-4">More from the Library</Eyebrow>
            <h2 className="font-display text-balance text-2xl font-semibold text-ivory md:text-3xl">
              Continue Reading
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Card href={`/library/${item.slug}`} tone="navy">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <Image
                        src={item.coverImage}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(min-width: 768px) 33vw, 100vw"
                      />
                    </div>
                    <div className="p-6">
                      <Eyebrow className="mb-2">{item.category}</Eyebrow>
                      <h3 className="font-display text-lg font-semibold text-ivory">
                        {item.title}
                      </h3>
                      <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                        Explore →
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}
    </PageShell>
  );
}
