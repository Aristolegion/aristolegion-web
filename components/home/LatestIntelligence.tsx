import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getLatestIntelligence } from "@/lib/latest";
import type { LatestItem, LatestItemType } from "@/lib/latest";

const TYPE_META: Record<LatestItemType, { label: string; cta: string }> = {
  publication: { label: "Intelligence Publication", cta: "Explore Intelligence →" },
  essay: { label: "Perspective", cta: "Read Perspective →" },
  newsletter: { label: "Dispatch", cta: "Open Dispatch →" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function LatestCard({ item }: { item: LatestItem }) {
  const meta = TYPE_META[item.type];

  return (
    <Card href={item.href} tone="navy" className="p-6">
      <Eyebrow className="mb-2">{meta.label}</Eyebrow>
      <h3 className="font-display text-xl font-semibold text-ivory">{item.title}</h3>
      <p className="mt-3 line-clamp-3 font-body text-sm leading-relaxed text-ivory-muted">
        {item.description}
      </p>
      <p className="mt-4 font-body text-xs uppercase tracking-[0.1em] text-ivory-muted/70">
        {formatDate(item.date)}
      </p>
      <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-ivory">
        {meta.cta}
      </span>
    </Card>
  );
}

// Homepage digest of everything currently live across the three Sanctum
// content types. Deliberately separate from the static Library/Essays
// preview sections above it, which only ever show the hand-written
// launch content — this one reflects whatever is actually published in
// Supabase right now, so it changes the moment something is published.
export async function LatestIntelligence() {
  const items = await getLatestIntelligence();

  // No "no posts yet" placeholder — an empty dynamic section is simply not
  // rendered, so the homepage never advertises an empty CMS.
  if (items.length === 0) {
    return null;
  }

  return (
    <Section id="latest" background="navy">
      <Container>
        <SectionHeading
          eyebrow="Latest From Aristolegion"
          title="Fresh From the House"
          description="The newest intelligence publications, essays, and dispatches — published directly from the Sanctum."
          tone="navy"
        />

        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <LatestCard item={item} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
