import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { UnsubscribeConfirm } from "@/components/preferences/UnsubscribeConfirm";
import type { NewsletterSubscriber } from "@/lib/sanctum/types";
import { supabaseSelect } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Unsubscribe — Aristolegion",
  robots: { index: false, follow: false },
};

// Same static-to-dynamic crash avoidance as every other Supabase-backed
// route in this app — see app/library/[slug]/page.tsx.
export const dynamic = "force-dynamic";

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
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
    console.error("UNSUBSCRIBE LOAD ERROR:", error);
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
              Leave the Aristolegion Intelligence Circle?
            </h1>
            <p className="mt-4 font-body text-sm text-ivory-muted">{subscriber.email}</p>
            <UnsubscribeConfirm token={token} alreadyUnsubscribed={Boolean(subscriber.unsubscribed_at)} />
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
