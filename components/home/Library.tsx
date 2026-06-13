import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { libraryItems } from "@/lib/content/homepage";

export function Library() {
  return (
    <Section id="library" background="navy">
      <Container>
        <Eyebrow className="mb-4">The Library</Eyebrow>
        <h2 className="font-display text-balance text-3xl font-semibold text-ivory md:text-5xl">
          Library
        </h2>
        <p className="mt-6 max-w-2xl font-body text-base text-ivory-muted">
          Section scaffold — publication cards in Phase 2.
        </p>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {libraryItems.map((item) => (
            <li
              key={item.id}
              className="border border-gold-muted bg-navy-elevated p-6"
            >
              <h3 className="font-display text-xl font-medium text-ivory">
                {item.title}
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
