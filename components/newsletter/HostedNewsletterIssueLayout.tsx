import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MarkdownContent } from "@/components/essay/MarkdownContent";
import type { NewsletterIssue } from "@/lib/sanctum/types";

interface HostedNewsletterIssueLayoutProps {
  issue: NewsletterIssue;
  coverUrl: string | null;
  isDraftPreview?: boolean;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function HostedNewsletterIssueLayout({
  issue,
  coverUrl,
  isDraftPreview = false,
}: HostedNewsletterIssueLayoutProps) {
  const createdLabel = formatDate(issue.created_at);

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <Link
            href="/newsletter"
            className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
          >
            ← Back to Newsletter
          </Link>

          {isDraftPreview && (
            <p className="mx-auto mt-6 max-w-3xl border border-gold-muted bg-charcoal px-4 py-2 text-center font-body text-xs font-medium uppercase tracking-[0.1em] text-gold">
              Draft Preview — visible only to Sanctum, not public
            </p>
          )}

          {coverUrl && (
            <div className="relative mx-auto mt-10 aspect-[16/9] max-w-3xl overflow-hidden border border-gold-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={issue.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mx-auto mt-10 max-w-3xl text-center">
            <Eyebrow className="mb-4">
              Newsletter{issue.issue_number ? ` · Issue ${issue.issue_number}` : ""}
            </Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              {issue.title}
            </h1>
            <p className="mt-6 font-body text-lg text-ivory-muted">{issue.subtitle}</p>
            {createdLabel && (
              <p className="mt-8 font-body text-sm uppercase tracking-[0.1em] text-ivory-muted">
                {createdLabel}
              </p>
            )}
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <article>
            <MarkdownContent content={issue.content} />
          </article>
        </Container>
      </Section>
    </PageShell>
  );
}
