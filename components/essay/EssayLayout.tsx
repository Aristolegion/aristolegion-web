import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { EssayHero } from "@/components/essay/EssayHero";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ExternalLinkButton } from "@/components/ui/ExternalLinkButton";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";
import { getRelatedEssays } from "@/lib/content/essays";
import type { Essay } from "@/lib/content/types";

interface EssayLayoutProps {
  essay: Essay;
}

export function EssayLayout({ essay }: EssayLayoutProps) {
  const related = getRelatedEssays(essay.slug);

  return (
    <PageShell>
      <EssayHero essay={essay} />

      <Section background="ivory">
        <Container>
          <article className="mx-auto max-w-[68ch]">
            {essay.sections.map((section, index) => (
              <ReadingSection key={index} {...section} dropCap={index === 0} />
            ))}
          </article>

          {essay.externalLinks?.primary && (
            <div className="mx-auto mt-16 max-w-[68ch] border-t border-charcoal/15 pt-12 text-center">
              <Eyebrow className="mb-4">Also Available</Eyebrow>
              <ExternalLinkButton
                href={essay.externalLinks.primary.url}
                label={essay.externalLinks.primary.label}
              />
            </div>
          )}
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow className="mb-4">Continue the Conversation</Eyebrow>
            <ExternalLinkButton
              href="https://www.linkedin.com/in/aristolegion/"
              label="Follow Aristolegion on LinkedIn"
            />
          </div>
        </Container>
      </Section>

      {related.length > 0 && (
        <Section background="navy">
          <Container>
            <Eyebrow className="mb-4">More Essays</Eyebrow>
            <h2 className="font-display text-balance text-2xl font-semibold text-ivory md:text-3xl">
              Continue Reading
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Card href={`/essays/${item.slug}`} tone="navy" className="p-6">
                    <Eyebrow className="mb-2">{item.category}</Eyebrow>
                    <h3 className="font-display text-lg font-semibold text-ivory">
                      {item.title}
                    </h3>
                    <p className="mt-3 font-body text-sm leading-relaxed text-ivory-muted">
                      {item.excerpt}
                    </p>
                    <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
                      Read More →
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-xl text-center">
            <Eyebrow className="mb-4">Stay Informed</Eyebrow>
            <h2 className="font-display text-balance text-2xl font-semibold text-charcoal md:text-3xl">
              Subscribe for New Essays and Publications
            </h2>
            <div className="mt-8">
              <NewsletterSignup tone="ivory" />
            </div>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
