import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PreferencesForm } from "@/components/preferences/PreferencesForm";
import type { NewsletterSubscriber } from "@/lib/sanctum/types";
import { supabaseSelect } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Email Preferences — Aristolegion",
  robots: { index: false, follow: false },
};

// Every request here does a no-store Supabase fetch, so this route must
// never attempt a static render — see app/library/[slug]/page.tsx for the
// exact crash this avoids.
export const dynamic = "force-dynamic";

interface PreferencesPageProps {
  params: Promise<{ token: string }>;
}

export default async function PreferencesPage({ params }: PreferencesPageProps) {
  const { token } = await params;

  let subscriber: NewsletterSubscriber | null = null;

  try {
    const result = await supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
      filter: { unsubscribe_token: `eq.${token}` },
    });

    if (result.ok && result.data.length > 0) {
      subscriber = result.data[0];
    }
  } catch (error) {
    console.error("PREFERENCES LOAD ERROR:", error);
  }

  if (!subscriber) {
    notFound();
  }

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-lg text-center">
            <Eyebrow className="mb-6">Aristolegion</Eyebrow>
            <h1 className="font-display text-balance text-3xl font-bold text-ivory md:text-4xl">
              Email Preferences
            </h1>
            <p className="mt-4 font-body text-sm text-ivory-muted">{subscriber.email}</p>
            <PreferencesForm token={token} initialConsent={subscriber.consent} />
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
