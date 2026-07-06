import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SanctumDashboard } from "@/components/sanctum/SanctumDashboard";
import { SanctumLoginForm } from "@/components/sanctum/SanctumLoginForm";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { supabaseSelect } from "@/lib/supabase";
import type { InnerCircleApplication, NewsletterSubscriber } from "@/lib/sanctum/types";

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
  let loadError: string | null = null;

  try {
    const [applicationsResult, subscribersResult] = await Promise.all([
      supabaseSelect<InnerCircleApplication>("inner_circle_applications", {
        order: "created_at.desc",
      }),
      supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
        order: "created_at.desc",
      }),
    ]);

    if (applicationsResult.ok) {
      applications = applicationsResult.data;
    } else {
      console.error("SANCTUM APPLICATIONS FETCH ERROR:", {
        status: applicationsResult.status,
        message: applicationsResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }

    if (subscribersResult.ok) {
      subscribers = subscribersResult.data;
    } else {
      console.error("SANCTUM SUBSCRIBERS FETCH ERROR:", {
        status: subscribersResult.status,
        message: subscribersResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }
  } catch (error) {
    console.error("SANCTUM DASHBOARD FETCH ERROR:", error);
    loadError = "Unable to load dashboard data. Please refresh.";
  }

  return (
    <SanctumDashboard
      applications={applications}
      subscribers={subscribers}
      loadError={loadError}
    />
  );
}
