import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { supabaseSelect } from "@/lib/supabase";
import type { NewsletterIssue } from "@/lib/sanctum/types";

export const metadata: Metadata = {
  title: "Newsletter — Aristolegion",
  description:
    "Published issues of the Aristolegion Newsletter — dispatches on judgment, capability, leadership, and human excellence.",
  alternates: {
    canonical: "https://aristolegion.com/newsletter",
  },
  openGraph: {
    title: "Newsletter — Aristolegion",
    description:
      "Published issues of the Aristolegion Newsletter — dispatches on judgment, capability, leadership, and human excellence.",
    type: "website",
    images: ["/images/crest.png"],
  },
};

// Every issue here comes from Supabase (no-store fetch), so this route must
// never attempt a static render — see app/essays/page.tsx for the exact
// crash this avoids.
export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function NewsletterPage() {
  let issues: NewsletterIssue[] = [];

  try {
    const result = await supabaseSelect<NewsletterIssue>("newsletter_issues", {
      order: "created_at.desc",
      filter: { status: "eq.published" },
    });

    if (result.ok) {
      issues = result.data;
    } else {
      console.error("NEWSLETTER ISSUE CMS ERROR:", {
        source: "fetch",
        status: result.status,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("NEWSLETTER ISSUE CMS ERROR:", { source: "fetch", error });
  }

  const [featured, ...rest] = issues;

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-6">Newsletter</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              The Aristolegion Newsletter
            </h1>
            <Divider className="mx-auto my-8 w-24" />
            <p className="font-body text-lg leading-relaxed text-ivory-muted">
              Published issues on judgment, capability, leadership, and human excellence — sent
              directly to the Aristolegion community.
            </p>
          </div>
        </Container>
      </Section>

      {featured && (
        <Section background="ivory">
          <Container>
            <Card href={`/newsletter/${featured.slug}`} tone="ivory" className="p-8 md:p-12">
              <Eyebrow className="mb-3">
                Issue {featured.issue_number} · Latest
              </Eyebrow>
              <h2 className="font-display text-balance text-2xl font-semibold text-charcoal md:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-charcoal/70">
                {featured.subtitle}
              </p>
              <p className="mt-6 font-body text-sm uppercase tracking-[0.1em] text-charcoal/50">
                {formatDate(featured.created_at)}
              </p>
              <span className="mt-6 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                Read More →
              </span>
            </Card>

            {rest.length > 0 && (
              <ul className="mt-10 grid gap-8 md:grid-cols-2">
                {rest.map((issue) => (
                  <li key={issue.slug}>
                    <Card href={`/newsletter/${issue.slug}`} tone="ivory" className="p-6">
                      <Eyebrow className="mb-2">Issue {issue.issue_number}</Eyebrow>
                      <h3 className="font-display text-xl font-semibold text-charcoal">
                        {issue.title}
                      </h3>
                      <p className="mt-3 font-body text-sm leading-relaxed text-charcoal/70">
                        {issue.subtitle}
                      </p>
                      <p className="mt-4 font-body text-xs uppercase tracking-[0.1em] text-charcoal/50">
                        {formatDate(issue.created_at)}
                      </p>
                      <span className="mt-4 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 group-hover:text-navy">
                        Read More →
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </Section>
      )}

      {!featured && (
        <Section background="ivory">
          <Container>
            <p className="text-center font-body text-sm text-charcoal/70">
              No newsletter issues have been published yet.
            </p>
          </Container>
        </Section>
      )}
    </PageShell>
  );
}
