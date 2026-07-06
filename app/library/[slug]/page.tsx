import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HostedPublicationLayout } from "@/components/publication/HostedPublicationLayout";
import { PublicationLayout } from "@/components/publication/PublicationLayout";
import { getPublication, publications } from "@/lib/content/library";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Publication as HostedPublication } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const VIEWER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

export const dynamicParams = true;

export function generateStaticParams() {
  return publications.map((publication) => ({ slug: publication.slug }));
}

interface PublicationPageProps {
  params: Promise<{ slug: string }>;
}

async function getHostedPublication(slug: string): Promise<HostedPublication | null> {
  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: { slug: `eq.${slug}`, status: "eq.published" },
    });

    if (!result.ok || result.data.length === 0) {
      return null;
    }

    return result.data[0];
  } catch (error) {
    console.error("LIBRARY PUBLICATION FETCH ERROR:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PublicationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const publication = getPublication(slug);

  if (publication) {
    return {
      title: `${publication.title} — Aristolegion Library`,
      description: publication.excerpt,
      authors: [{ name: publication.author }],
      alternates: {
        canonical: `https://aristolegion.com/library/${publication.slug}`,
      },
      openGraph: {
        title: publication.title,
        description: publication.excerpt,
        type: "article",
        publishedTime: publication.publishDate,
        authors: [publication.author],
        images: [publication.coverImage],
      },
    };
  }

  const hosted = await getHostedPublication(slug);

  if (!hosted) {
    return {};
  }

  return {
    title: `${hosted.title} — Aristolegion Library`,
    description: hosted.description,
    alternates: {
      canonical: `https://aristolegion.com/library/${hosted.slug}`,
    },
    openGraph: {
      title: hosted.title,
      description: hosted.description,
      type: "article",
      publishedTime: hosted.published_at ?? undefined,
    },
  };
}

export default async function PublicationPage({
  params,
}: PublicationPageProps) {
  const { slug } = await params;
  const publication = getPublication(slug);

  if (publication) {
    return <PublicationLayout publication={publication} />;
  }

  const hosted = await getHostedPublication(slug);

  if (!hosted || !hosted.pdf_url) {
    notFound();
  }

  let signed: Awaited<ReturnType<typeof supabaseCreateSignedUrl>>;
  try {
    signed = await supabaseCreateSignedUrl(PUBLICATIONS_BUCKET, hosted.pdf_url, VIEWER_URL_TTL_SECONDS);
  } catch (error) {
    console.error("LIBRARY PDF SIGN ERROR:", error);
    notFound();
  }

  if (!signed.ok) {
    console.error("LIBRARY PDF SIGN ERROR:", {
      status: signed.status,
      message: signed.message,
    });
    notFound();
  }

  let coverUrl: string | null = null;
  if (hosted.cover_image_url) {
    try {
      const signedCover = await supabaseCreateSignedUrl(
        PUBLICATIONS_BUCKET,
        hosted.cover_image_url,
        VIEWER_URL_TTL_SECONDS
      );
      coverUrl = signedCover.ok ? signedCover.url : null;
    } catch (error) {
      console.error("LIBRARY COVER SIGN ERROR:", error);
    }
  }

  return (
    <HostedPublicationLayout
      publication={hosted}
      viewerUrl={signed.url}
      downloadUrl={`${signed.url}&download=${encodeURIComponent(hosted.slug)}.pdf`}
      coverUrl={coverUrl}
    />
  );
}
