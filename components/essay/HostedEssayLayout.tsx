import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ExternalLinkButton } from "@/components/ui/ExternalLinkButton";
import { MarkdownContent } from "@/components/essay/MarkdownContent";
import type { Essay } from "@/lib/sanctum/types";

interface HostedEssayLayoutProps {
  essay: Essay;
  coverUrl: string | null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function HostedEssayLayout({ essay, coverUrl }: HostedEssayLayoutProps) {
  const publishedLabel = formatDate(essay.published_at);

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <Link
            href="/essays"
            className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
          >
            ← Back to Essays
          </Link>

          {coverUrl && (
            <div className="relative mx-auto mt-10 aspect-[16/9] max-w-3xl overflow-hidden border border-gold-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={essay.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mx-auto mt-10 max-w-3xl text-center">
            <Eyebrow className="mb-4">Essay</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl lg:text-6xl">
              {essay.title}
            </h1>
            {publishedLabel && (
              <p className="mt-8 font-body text-sm uppercase tracking-[0.1em] text-ivory-muted">
                {publishedLabel}
              </p>
            )}
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <article>
            <MarkdownContent content={essay.content} />
          </article>

          {essay.linkedin_url && (
            <div className="mx-auto mt-16 max-w-[68ch] border-t border-charcoal/15 pt-12 text-center">
              <Eyebrow className="mb-4">Join the Discussion</Eyebrow>
              <ExternalLinkButton
                href={essay.linkedin_url}
                label="Continue discussion on LinkedIn"
              />
            </div>
          )}
        </Container>
      </Section>
    </PageShell>
  );
}
