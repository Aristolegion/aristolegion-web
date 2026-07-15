import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  PublicationTemplate,
  type PublicationTemplateData,
} from "@/components/publication/PublicationTemplate";
import { getPublication, publications } from "@/lib/content/library";
import { getPublicationDisplayCategory } from "@/lib/content/publicationEnhancements";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { Publication as HostedPublication } from "@/lib/sanctum/types";
import type { Publication as StaticPublication } from "@/lib/content/types";

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
      twitter: {
        card: "summary_large_image",
        title: publication.title,
        description: publication.excerpt,
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

function toTemplateDataFromStatic(publication: StaticPublication): PublicationTemplateData {
  return {
    slug: publication.slug,
    category: getPublicationDisplayCategory(publication.title, publication.category),
    title: publication.title,
    description: publication.subtitle,
    fallbackSource: publication.excerpt,
    year: new Date(publication.publishDate).getFullYear().toString(),
    author: publication.author,
    readingTime: publication.readingTime,
    coverSrc: publication.coverImage,
    coverIsExternal: false,
    readingSections: publication.sections,
    primaryAction: publication.externalLinks?.primary
      ? {
          label: publication.externalLinks.primary.label,
          href: publication.externalLinks.primary.url,
          external: true,
        }
      : undefined,
  };
}

// A publication authored with a blank line between paragraphs renders as
// multiple Intelligence Brief paragraphs; a single-paragraph entry (the
// common case) becomes a one-element array. Either way, an empty/whitespace
// field yields undefined so PublicationTemplate falls through to the
// curated/generated fallback rather than rendering an empty section.
function toParagraphs(value: string | null): string[] | undefined {
  if (!value || !value.trim()) return undefined;
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : undefined;
}

function toTemplateDataFromHosted(
  hosted: HostedPublication,
  coverUrl: string | null,
  pdfPreviewUrl: string | null,
  pdfDownloadUrl: string | null,
  isDraftPreview: boolean
): PublicationTemplateData {
  const dateSource = hosted.published_at ?? hosted.created_at;

  return {
    slug: hosted.slug,
    category: getPublicationDisplayCategory(hosted.title, hosted.category),
    title: hosted.title,
    description: hosted.description,
    year: dateSource ? new Date(dateSource).getFullYear().toString() : null,
    coverSrc: coverUrl,
    coverIsExternal: true,
    isDraftPreview,
    intelligenceBrief: toParagraphs(hosted.intelligence_brief),
    centralQuestion: hosted.central_question?.trim() || undefined,
    keyInsights: hosted.key_insights && hosted.key_insights.length > 0 ? hosted.key_insights : undefined,
    framework: hosted.framework ?? undefined,
    primaryAction: pdfPreviewUrl
      ? { label: "Read Publication", href: pdfPreviewUrl, external: true }
      : undefined,
    secondaryAction: pdfDownloadUrl
      ? { label: "Download PDF", href: pdfDownloadUrl, external: true }
      : undefined,
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
    return <PublicationTemplate data={toTemplateDataFromStatic(publication)} />;
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
    <PublicationTemplate
      data={toTemplateDataFromHosted(hosted, coverUrl, pdfPreviewUrl, pdfDownloadUrl, isDraftPreview)}
    />
  );
}
