import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { HostedPublicationLayout } from "@/components/publication/HostedPublicationLayout";
import { PublicationLayout } from "@/components/publication/PublicationLayout";
import { getPublication, publications } from "@/lib/content/library";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Publication as HostedPublication } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const VIEWER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

export const dynamicParams = true;

// The 4 known static slugs are listed here, but the route must never attempt
// static rendering — a params not in this list (any hosted Supabase
// publication) hits a no-store fetch mid-render, and in this Next.js build
// that produces an unrecoverable "Page changed from static to dynamic at
// runtime" crash instead of the documented graceful SSR fallback. Forcing
// the whole route dynamic removes the static-render attempt entirely, so
// this class of crash can't happen for any slug, known or not.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return publications.map((publication) => ({ slug: publication.slug }));
}

interface PublicationPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

async function hasSanctumSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;
  return isValidSessionToken(token);
}

// `allowDraft` is only ever true when both ?preview=true is present AND the
// request carries a valid Sanctum session cookie — an unauthenticated
// visitor hitting the same URL still only ever sees published publications.
async function getHostedPublication(slug: string, allowDraft: boolean): Promise<HostedPublication | null> {
  try {
    const result = await supabaseSelect<HostedPublication>("publications", {
      filter: allowDraft ? { slug: `eq.${slug}` } : { slug: `eq.${slug}`, status: "eq.published" },
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
  searchParams,
}: PublicationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
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

  const allowDraft = preview === "true" && (await hasSanctumSession());
  const hosted = await getHostedPublication(slug, allowDraft);

  if (!hosted) {
    return {};
  }

  const isDraftPreview = allowDraft && hosted.status !== "published";

  return {
    title: `${hosted.title} — Aristolegion Library`,
    description: hosted.description,
    ...(isDraftPreview ? { robots: { index: false, follow: false } } : {}),
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
  searchParams,
}: PublicationPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const publication = getPublication(slug);

  if (publication) {
    return <PublicationLayout publication={publication} />;
  }

  const allowDraft = preview === "true" && (await hasSanctumSession());
  const hosted = await getHostedPublication(slug, allowDraft);

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

  const isDraftPreview = allowDraft && hosted.status !== "published";

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
      isDraftPreview={isDraftPreview}
    />
  );
}
