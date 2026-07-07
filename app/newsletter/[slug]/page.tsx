import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { HostedNewsletterIssueLayout } from "@/components/newsletter/HostedNewsletterIssueLayout";
import { excerptFromMarkdown } from "@/lib/markdown";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type { NewsletterIssue } from "@/lib/sanctum/types";

const PUBLICATIONS_BUCKET = "publications";
const COVER_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every request

// This route has no static content at all (unlike /essays or /library,
// which merge in a handful of hand-written pages) — every slug is a
// Supabase row, so there's nothing to pass to generateStaticParams and
// nothing for Next.js to attempt statically. That sidesteps the
// static-to-dynamic crash described in app/essays/[slug]/page.tsx entirely,
// but dynamic is still forced explicitly for the same defensive reason.
export const dynamic = "force-dynamic";

interface NewsletterIssuePageProps {
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
// visitor hitting the same URL still only ever sees published issues.
async function getHostedIssue(slug: string, allowDraft: boolean): Promise<NewsletterIssue | null> {
  try {
    const result = await supabaseSelect<NewsletterIssue>("newsletter_issues", {
      filter: allowDraft ? { slug: `eq.${slug}` } : { slug: `eq.${slug}`, status: "eq.published" },
    });

    if (!result.ok || result.data.length === 0) {
      return null;
    }

    return result.data[0];
  } catch (error) {
    console.error("NEWSLETTER ISSUE CMS ERROR:", { slug, source: "fetch", error });
    return null;
  }
}

function hasRequiredFields(
  issue: NewsletterIssue
): issue is NewsletterIssue & { title: string; slug: string; subtitle: string; content: string } {
  return Boolean(issue.title && issue.slug && issue.subtitle && issue.content);
}

export async function generateMetadata({
  params,
  searchParams,
}: NewsletterIssuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;

  const allowDraft = preview === "true" && (await hasSanctumSession());
  const issue = await getHostedIssue(slug, allowDraft);

  if (!issue) {
    return {};
  }

  const isDraftPreview = allowDraft && issue.status !== "published";
  const description = excerptFromMarkdown(issue.content, 200) || issue.subtitle;

  return {
    title: `${issue.title} — Aristolegion Newsletter`,
    description,
    ...(isDraftPreview ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical: `https://aristolegion.com/newsletter/${issue.slug}`,
    },
    openGraph: {
      title: issue.title,
      description,
      type: "article",
      publishedTime: issue.sent_at ?? issue.created_at,
    },
  };
}

export default async function NewsletterIssuePage({ params, searchParams }: NewsletterIssuePageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const allowDraft = preview === "true" && (await hasSanctumSession());
  const issue = await getHostedIssue(slug, allowDraft);

  if (!issue) {
    notFound();
  }

  if (!hasRequiredFields(issue)) {
    console.error("NEWSLETTER ISSUE CMS ERROR:", {
      slug,
      source: "required_fields",
      error: "Missing one or more of: title, slug, subtitle, content",
    });
    notFound();
  }

  const isDraftPreview = allowDraft && issue.status !== "published";

  let coverUrl: string | null = null;

  if (issue.cover_image_url) {
    try {
      const signedCover = await supabaseCreateSignedUrl(
        PUBLICATIONS_BUCKET,
        issue.cover_image_url,
        COVER_URL_TTL_SECONDS
      );

      if (signedCover.ok) {
        coverUrl = signedCover.url;
      } else {
        console.error("NEWSLETTER ISSUE CMS ERROR:", {
          slug,
          source: "cover_signed_url",
          error: { status: signedCover.status, message: signedCover.message },
        });
      }
    } catch (error) {
      console.error("NEWSLETTER ISSUE CMS ERROR:", { slug, source: "cover_signed_url", error });
    }
  }

  return <HostedNewsletterIssueLayout issue={issue} coverUrl={coverUrl} isDraftPreview={isDraftPreview} />;
}
