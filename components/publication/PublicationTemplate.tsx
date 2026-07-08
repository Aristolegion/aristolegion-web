import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { CentralQuestion } from "@/components/publication/CentralQuestion";
import { FrameworkPreview } from "@/components/publication/FrameworkPreview";
import { IntelligenceBrief } from "@/components/publication/IntelligenceBrief";
import { KeyInsights } from "@/components/publication/KeyInsights";
import { PublicationAccess } from "@/components/publication/PublicationAccess";
import { PublicationHero } from "@/components/publication/PublicationHero";
import { ReadingSection } from "@/components/publication/ReadingSection";
import { RelatedIntelligence } from "@/components/publication/RelatedIntelligence";
import { getPublicationEnhancement } from "@/lib/content/publicationEnhancements";
import type {
  PublicationFrameworkPreview,
  PublicationInsight,
  PublicationSection,
} from "@/lib/content/types";
import {
  deriveCentralQuestion,
  deriveIntelligenceBrief,
  deriveKeyInsights,
} from "@/lib/publicationFallbacks";

export interface PublicationAccessAction {
  label: string;
  href: string;
  external?: boolean;
}

// Normalized shape both the static (lib/content/library.ts) and hosted
// (Sanctum/Supabase) publication data sources are mapped into by
// app/library/[slug]/page.tsx, so this template — and every section below
// it — never needs to know which source a publication came from.
export interface PublicationTemplateData {
  slug: string;
  category: string;
  title: string;
  description: string;
  /**
   * Secondary summary text (e.g. a static publication's shorter excerpt)
   * used to derive the Intelligence Brief / Central Question fallbacks when
   * no curated enhancement exists — kept distinct from `description` so an
   * uncurated publication doesn't repeat its hero quote verbatim in the
   * next two sections. Falls back to `description` itself when absent.
   */
  fallbackSource?: string;
  year: string | null;
  author?: string;
  readingTime?: string;
  coverSrc: string | null;
  coverIsExternal: boolean;
  isDraftPreview?: boolean;
  /** Long-form article content, e.g. The Glass Partition's chapter excerpts. Optional — most publications won't have this. */
  readingSections?: PublicationSection[];
  primaryAction?: PublicationAccessAction;
  secondaryAction?: PublicationAccessAction;
  /**
   * Editorial metadata sourced directly from the publication record (e.g. a
   * Sanctum-authored publication). Takes priority over the curated static
   * `publicationEnhancements.ts` entry and the generated fallback below —
   * see the priority chain in the component body.
   */
  intelligenceBrief?: string[];
  centralQuestion?: string;
  keyInsights?: PublicationInsight[];
  framework?: PublicationFrameworkPreview;
}

export function PublicationTemplate({ data }: { data: PublicationTemplateData }) {
  const enhancement = getPublicationEnhancement(data.title);
  const fallbackSource = data.fallbackSource ?? data.description;

  // Priority: publication's own editorial fields (e.g. authored in Sanctum)
  // > curated static override (legacy publications predating these fields)
  // > generated fallback derived from the description — so a publication
  // never regresses to repeated description text once real fields exist,
  // and nothing already curated or already published breaks.
  const intelligenceBrief =
    data.intelligenceBrief ?? enhancement?.intelligenceBrief ?? deriveIntelligenceBrief(fallbackSource);
  const centralQuestion =
    data.centralQuestion ?? enhancement?.centralQuestion ?? deriveCentralQuestion(fallbackSource);
  const keyInsights = data.keyInsights ?? enhancement?.keyInsights ?? deriveKeyInsights(fallbackSource);
  const framework = data.framework ?? enhancement?.framework;

  return (
    <PageShell>
      <PublicationHero
        category={data.category}
        title={data.title}
        description={data.description}
        year={data.year}
        author={data.author}
        readingTime={data.readingTime}
        coverSrc={data.coverSrc}
        coverIsExternal={data.coverIsExternal}
        isDraftPreview={data.isDraftPreview}
      />

      <IntelligenceBrief paragraphs={intelligenceBrief} />

      <CentralQuestion question={centralQuestion} />

      <KeyInsights insights={keyInsights} />

      <FrameworkPreview framework={framework} />

      {data.readingSections && data.readingSections.length > 0 && (
        <Section background="ivory">
          <Container>
            <article className="mx-auto max-w-[68ch]">
              {data.readingSections.map((section, index) => (
                <ReadingSection key={index} {...section} dropCap={index === 0} />
              ))}
            </article>
          </Container>
        </Section>
      )}

      <PublicationAccess primaryAction={data.primaryAction} secondaryAction={data.secondaryAction} />

      <RelatedIntelligence currentSlug={data.slug} />
    </PageShell>
  );
}
