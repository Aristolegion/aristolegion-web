import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { publications as staticPublications } from "@/lib/content/library";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Publication as HostedPublication } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

interface FeaturedItem {
  slug: string;
  title: string;
  category: string;
  description: string;
  coverImage: string | null;
  isHosted: boolean;
}

// Curated homepage order per the content architecture review — deliberately
// fixed rather than date-sorted: the flagship framework leads, fiction
// closes the shelf instead of opening it. Title/category/description are
// the reviewed homepage copy, independent of whatever the live Sanctum
// record says, so hosted publications are only used as a slug + cover
// lookup here.
const FEATURED_HOSTED_SLOTS: {
  match: (title: string) => boolean;
  title: string;
  category: string;
  description: string;
}[] = [
  {
    match: (title) => title.includes("capability dividend"),
    title: "Capability Dividend™",
    category: "Framework",
    description:
      "A framework examining how human capability compounds beyond knowledge, skills, and credentials.",
  },
  {
    match: (title) => title.includes("employability fracture"),
    title: "Aristolegion Intelligence Journal — Employability Fracture",
    category: "Intelligence Publication",
    description:
      "Deconstructing changing talent realities and the increasing importance of judgment-driven capability.",
  },
  {
    match: (title) => title.includes("aristolegion intelligence journal"),
    title: "Aristolegion Intelligence Journal",
    category: "Research Journal",
    description:
      "Research notes exploring capability, leadership intelligence, and the future of work.",
  },
];

async function getFeaturedItems(): Promise<FeaturedItem[]> {
  let hostedPublications: HostedPublication[] = [];

  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      hostedPublications = result.data;
    } else {
      console.error("HOMEPAGE LIBRARY FETCH ERROR:", {
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("HOMEPAGE LIBRARY FETCH ERROR:", error);
  }

  const usedIds = new Set<string>();
  const featured: FeaturedItem[] = [];

  for (const slot of FEATURED_HOSTED_SLOTS) {
    const match = hostedPublications.find(
      (publication) =>
        !usedIds.has(publication.id) && slot.match(publication.title.toLowerCase())
    );

    if (!match) continue;
    usedIds.add(match.id);

    const coverUrl = match.cover_image_url
      ? await supabaseCreateSignedUrl(
          PUBLICATIONS_BUCKET,
          match.cover_image_url,
          COVER_URL_TTL_SECONDS
        )
      : null;

    featured.push({
      slug: match.slug,
      title: slot.title,
      category: slot.category,
      description: slot.description,
      coverImage: coverUrl?.ok ? coverUrl.url : null,
      isHosted: true,
    });
  }

  const glassPartition = staticPublications.find(
    (publication) => publication.slug === "the-glass-partition"
  );

  if (glassPartition) {
    featured.push({
      slug: glassPartition.slug,
      title: glassPartition.title,
      category: "Novel",
      description:
        "A philosophical exploration of invisible barriers within modern institutions.",
      coverImage: glassPartition.coverImage,
      isHosted: false,
    });
  }

  return featured;
}

export async function Library() {
  const items = await getFeaturedItems();

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
          {items.map((item) => (
            <li key={item.slug}>
              <Card href={`/library/${item.slug}`} tone="navy">
                <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
                  {item.coverImage ? (
                    item.isHosted ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={item.coverImage}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                      <Eyebrow>{item.category}</Eyebrow>
                    </div>
                  )}
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
