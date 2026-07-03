import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { libraryItems } from "@/lib/content/homepage";

export function Library() {
  return (
    <Section id="library" background="navy">
      <Container>
        <SectionHeading
          eyebrow="The Library"
          title="The Central Publishing Hub"
          description="A curated collection of research publications, executive journals, essays, and intellectual works exploring capability, judgment, authority, resilience, and human excellence."
          tone="navy"
        />

        <ul className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {libraryItems.map((item) => (
            <li key={item.id}>
              <Card href={item.href} tone="navy">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                </div>
                <div className="p-6">
                  <Eyebrow className="mb-2">{item.category}</Eyebrow>
                  <h3 className="font-display text-xl font-semibold text-ivory">
                    {item.title}
                  </h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                    {item.description}
                  </p>
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
  );
}
