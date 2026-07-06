import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SanctumDashboard } from "@/components/sanctum/SanctumDashboard";
import { SanctumLoginForm } from "@/components/sanctum/SanctumLoginForm";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { supabaseCreateSignedUrl, supabaseSelect } from "@/lib/supabase";
import type {
  Essay,
  EssayWithPreview,
  InnerCircleApplication,
  NewsletterSubscriber,
  Publication,
  PublicationWithPreview,
} from "@/lib/sanctum/types";

const PDF_BUCKET = "publications";
const PREVIEW_URL_TTL_SECONDS = 60 * 60; // 1 hour, just for the Sanctum preview link

export const metadata: Metadata = {
  title: "Command Center | Aristolegion",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SanctumPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return <SanctumLoginForm />;
  }

  let applications: InnerCircleApplication[] = [];
  let subscribers: NewsletterSubscriber[] = [];
  let publications: PublicationWithPreview[] = [];
  let essays: EssayWithPreview[] = [];
  let loadError: string | null = null;

  try {
    const [applicationsResult, subscribersResult, publicationsResult, essaysResult] = await Promise.all([
      supabaseSelect<InnerCircleApplication>("inner_circle_applications", {
        order: "created_at.desc",
      }),
      supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
        order: "created_at.desc",
      }),
      supabaseSelect<Publication>("publications", {
        order: "created_at.desc",
      }),
      supabaseSelect<Essay>("essays", {
        order: "created_at.desc",
      }),
    ]);

    if (applicationsResult.ok) {
      applications = applicationsResult.data;
    } else {
      console.error("SANCTUM LOAD ERROR:", {
        source: "inner_circle_applications",
        status: applicationsResult.status,
        message: applicationsResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }

    if (subscribersResult.ok) {
      subscribers = subscribersResult.data;
    } else {
      console.error("SANCTUM LOAD ERROR:", {
        source: "newsletter_subscribers",
        status: subscribersResult.status,
        message: subscribersResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }

    if (publicationsResult.ok) {
      publications = await Promise.all(
        publicationsResult.data.map(async (publication) => {
          const [pdfSigned, coverSigned] = await Promise.all([
            publication.pdf_url
              ? supabaseCreateSignedUrl(PDF_BUCKET, publication.pdf_url, PREVIEW_URL_TTL_SECONDS)
              : null,
            publication.cover_image_url
              ? supabaseCreateSignedUrl(PDF_BUCKET, publication.cover_image_url, PREVIEW_URL_TTL_SECONDS)
              : null,
          ]);

          // A failed signed URL only drops that publication's preview/thumbnail —
          // it must not surface as a dashboard-wide load error.
          if (pdfSigned && !pdfSigned.ok) {
            console.error("SANCTUM LOAD ERROR:", {
              source: "publications.pdf_signed_url",
              publicationId: publication.id,
              status: pdfSigned.status,
              message: pdfSigned.message,
            });
          }
          if (coverSigned && !coverSigned.ok) {
            console.error("SANCTUM LOAD ERROR:", {
              source: "publications.cover_signed_url",
              publicationId: publication.id,
              status: coverSigned.status,
              message: coverSigned.message,
            });
          }

          return {
            ...publication,
            pdfPreviewUrl: pdfSigned?.ok ? pdfSigned.url : null,
            coverPreviewUrl: coverSigned?.ok ? coverSigned.url : null,
          };
        })
      );
    } else {
      console.error("SANCTUM LOAD ERROR:", {
        source: "publications",
        status: publicationsResult.status,
        message: publicationsResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }

    if (essaysResult.ok) {
      essays = await Promise.all(
        essaysResult.data.map(async (essay) => {
          const coverSigned = essay.cover_image_url
            ? await supabaseCreateSignedUrl(PDF_BUCKET, essay.cover_image_url, PREVIEW_URL_TTL_SECONDS)
            : null;

          if (coverSigned && !coverSigned.ok) {
            console.error("ESSAY CMS ERROR:", {
              source: "cover_signed_url",
              essayId: essay.id,
              status: coverSigned.status,
              message: coverSigned.message,
            });
          }

          return { ...essay, coverPreviewUrl: coverSigned?.ok ? coverSigned.url : null };
        })
      );
    } else {
      console.error("ESSAY CMS ERROR:", {
        source: "fetch",
        status: essaysResult.status,
        message: essaysResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }
  } catch (error) {
    console.error("SANCTUM LOAD ERROR:", error);
    loadError = "Unable to load dashboard data. Please refresh.";
  }

  return (
    <SanctumDashboard
      applications={applications}
      subscribers={subscribers}
      publications={publications}
      essays={essays}
      loadError={loadError}
    />
  );
}
