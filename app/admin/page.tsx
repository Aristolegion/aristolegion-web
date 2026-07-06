import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin/auth";
import { supabaseSelect } from "@/lib/supabase";
import type { InnerCircleApplication, NewsletterSubscriber } from "@/lib/admin/types";

export const metadata: Metadata = {
  title: "Command Center | Aristolegion",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isValidAdminSessionToken(token)) {
    return <AdminLoginForm />;
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
      console.error("ADMIN APPLICATIONS FETCH ERROR:", {
        status: applicationsResult.status,
        message: applicationsResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }

    if (subscribersResult.ok) {
      subscribers = subscribersResult.data;
    } else {
      console.error("ADMIN SUBSCRIBERS FETCH ERROR:", {
        status: subscribersResult.status,
        message: subscribersResult.message,
      });
      loadError = "Unable to load some dashboard data. Please refresh.";
    }
  } catch (error) {
    console.error("ADMIN DASHBOARD FETCH ERROR:", error);
    loadError = "Unable to load dashboard data. Please refresh.";
  }

  return (
    <AdminDashboard
      applications={applications}
      subscribers={subscribers}
      loadError={loadError}
    />
  );
}
