import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EssayLayout } from "@/components/essay/EssayLayout";
import { HostedEssayLayout } from "@/components/essay/HostedEssayLayout";
import { essays, getEssay } from "@/lib/content/essays";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Essay as HostedEssay } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

// See app/library/[slug]/page.tsx for why this route is force-dynamic:
// combining generateStaticParams with an on-demand no-store fetch for
// unknown params crashes in this Next.js build instead of falling back to
// SSR gracefully. Applied here from the start rather than after a crash.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return essays.map((essay) => ({ slug: essay.slug }));
}

interface EssayPageProps {
  params: Promise<{ slug: string }>;
}

async function getHostedEssay(slug: string): Promise<HostedEssay | null> {
  try {
    const result = await supabaseSelect<HostedEssay>("essays", {
      filter: { slug: `eq.${slug}`, status: "eq.published" },
    });

    if (!result.ok || result.data.length === 0) {
      return null;
    }

    return result.data[0];
  } catch (error) {
    console.error("ESSAY CMS ERROR:", { slug, source: "fetch", error });
    return null;
  }
}

function hasRequiredFields(
  essay: HostedEssay
): essay is HostedEssay & { title: string; slug: string; content: string } {
  return Boolean(essay.title && essay.slug && essay.content);
}

export async function generateMetadata({ params }: EssayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const essay = getEssay(slug);

  if (essay) {
    return {
      title: `${essay.title} — Aristolegion Essays`,
      description: essay.excerpt,
      authors: [{ name: essay.author }],
      alternates: {
        canonical: `https://aristolegion.com/essays/${essay.slug}`,
      },
      openGraph: {
        title: essay.title,
        description: essay.excerpt,
        type: "article",
        publishedTime: essay.publishDate,
        authors: [essay.author],
      },
    };
  }

  const hosted = await getHostedEssay(slug);

  if (!hosted) {
    return {};
  }

  return {
    title: `${hosted.title} — Aristolegion Essays`,
    description: hosted.excerpt,
    alternates: {
      canonical: `https://aristolegion.com/essays/${hosted.slug}`,
    },
    openGraph: {
      title: hosted.title,
      description: hosted.excerpt,
      type: "article",
      publishedTime: hosted.published_at ?? undefined,
    },
  };
}

export default async function EssayPage({ params }: EssayPageProps) {
  const { slug } = await params;
  const essay = getEssay(slug);

  if (essay) {
    return <EssayLayout essay={essay} />;
  }

  const hosted = await getHostedEssay(slug);

  if (!hosted) {
    notFound();
  }

  if (!hasRequiredFields(hosted)) {
    console.error("ESSAY CMS ERROR:", {
      slug,
      source: "required_fields",
      error: "Missing one or more of: title, slug, content",
    });
    notFound();
  }

  let coverUrl: string | null = null;

  if (hosted.cover_image_url) {
    try {
      const signedCover = await supabaseCreateSignedUrl(
        PUBLICATIONS_BUCKET,
        hosted.cover_image_url,
        COVER_URL_TTL_SECONDS
      );

      if (signedCover.ok) {
        coverUrl = signedCover.url;
      } else {
        console.error("ESSAY CMS ERROR:", {
          slug,
          source: "cover_signed_url",
          error: { status: signedCover.status, message: signedCover.message },
        });
      }
    } catch (error) {
      console.error("ESSAY CMS ERROR:", { slug, source: "cover_signed_url", error });
    }
  }

  return <HostedEssayLayout essay={hosted} coverUrl={coverUrl} />;
}
