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
    console.error("HOSTED PUBLICATION LOAD ERROR:", { slug, source: "fetch", error });
    return null;
  }
}

function hasRequiredFields(
  hosted: HostedPublication
): hosted is HostedPublication & { title: string; slug: string; cover_image_url: string } {
  return Boolean(hosted.title && hosted.slug && hosted.cover_image_url);
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

  if (!hosted) {
    notFound();
  }

  // A publication missing its core fields isn't ready for a public page,
  // regardless of whether its PDF happens to be reachable. The PDF itself is
  // allowed to fail gracefully below — only these three are non-negotiable.
  if (!hasRequiredFields(hosted)) {
    console.error("HOSTED PUBLICATION LOAD ERROR:", {
      slug,
      source: "required_fields",
      error: "Missing one or more of: title, slug, cover_image_url",
    });
    notFound();
  }

  let pdfPreviewUrl: string | null = null;
  let pdfDownloadUrl: string | null = null;

  if (hosted.pdf_url) {
    try {
      const signed = await supabaseCreateSignedUrl(PUBLICATIONS_BUCKET, hosted.pdf_url, VIEWER_URL_TTL_SECONDS);

      if (signed.ok) {
        pdfPreviewUrl = signed.url;
        pdfDownloadUrl = `${signed.url}&download=${encodeURIComponent(hosted.slug)}.pdf`;
      } else {
        console.error("HOSTED PUBLICATION LOAD ERROR:", {
          slug,
          source: "pdf_signed_url",
          error: { status: signed.status, message: signed.message },
        });
      }
    } catch (error) {
      console.error("HOSTED PUBLICATION LOAD ERROR:", { slug, source: "pdf_signed_url", error });
    }
  }

  let coverUrl: string | null = null;

  try {
    const signedCover = await supabaseCreateSignedUrl(
      PUBLICATIONS_BUCKET,
      hosted.cover_image_url,
      VIEWER_URL_TTL_SECONDS
    );

    if (signedCover.ok) {
      coverUrl = signedCover.url;
    } else {
      console.error("HOSTED PUBLICATION LOAD ERROR:", {
        slug,
        source: "cover_signed_url",
        error: { status: signedCover.status, message: signedCover.message },
      });
    }
  } catch (error) {
    console.error("HOSTED PUBLICATION LOAD ERROR:", { slug, source: "cover_signed_url", error });
  }

  return (
    <HostedPublicationLayout
      publication={hosted}
      pdfPreviewUrl={pdfPreviewUrl}
      pdfDownloadUrl={pdfDownloadUrl}
      coverUrl={coverUrl}
    />
  );
}
