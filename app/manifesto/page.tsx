import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { manifestoSections } from "@/lib/content/manifesto";

export const metadata: Metadata = {
  title: "Manifesto — Aristolegion",
  description:
    "The philosophy, principles, and purpose behind Aristolegion — an independent intellectual institution dedicated to judgment, capability, and human excellence.",
  openGraph: {
    title: "The Aristolegion Manifesto",
    description:
      "The philosophy, principles, and purpose behind Aristolegion — an independent intellectual institution dedicated to judgment, capability, and human excellence.",
    type: "article",
    images: ["/images/crest.png"],
  },
};

export default function ManifestoPage() {
  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">The Manifesto</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              A Philosophy of Judgment and Capability
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              The principles, purpose, and institutional philosophy behind
              Aristolegion.
            </p>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <article className="mx-auto max-w-[68ch]">
            {manifestoSections.map((section, index) => (
              <ReadingSection
                key={index}
                {...section}
                dropCap={index === 0}
              />
            ))}
          </article>

          <div className="mx-auto mt-16 max-w-[68ch] border-t border-charcoal/15 pt-12 text-center">
            <Button href="/#library" variant="primary">
              Explore the Library
            </Button>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
