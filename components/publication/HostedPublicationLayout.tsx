import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Publication } from "@/lib/sanctum/types";

interface HostedPublicationLayoutProps {
  publication: Publication;
  viewerUrl: string;
  downloadUrl: string;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function HostedPublicationLayout({
  publication,
  viewerUrl,
  downloadUrl,
}: HostedPublicationLayoutProps) {
  const publishedLabel = formatDate(publication.published_at);

  return (
    <PageShell>
      <Section background="navy">
        <Container>
          <Link
            href="/library"
            className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
          >
            ← Back to the Library
          </Link>

          <div className="mx-auto mt-10 max-w-3xl">
            <Eyebrow className="mb-4">{publication.category}</Eyebrow>
            <h1 className="font-display text-balance text-4xl font-bold text-ivory md:text-5xl">
              {publication.title}
            </h1>
            {publishedLabel && (
              <p className="mt-6 font-body text-sm uppercase tracking-[0.1em] text-ivory-muted">
                Published {publishedLabel}
              </p>
            )}
            <p className="mt-6 font-body text-lg leading-relaxed text-ivory-muted">
              {publication.description}
            </p>
            <div className="mt-8">
              <Button href={downloadUrl} external variant="primary">
                Download PDF ↓
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-4xl border border-charcoal/15">
            <object
              data={viewerUrl}
              type="application/pdf"
              className="h-[80vh] w-full"
              aria-label={`${publication.title} PDF`}
            >
              <p className="p-8 text-center font-body text-sm text-charcoal/70">
                Your browser can&apos;t display the PDF inline.{" "}
                <a
                  href={downloadUrl}
                  className="font-medium text-gold underline underline-offset-4"
                >
                  Download it instead
                </a>
                .
              </p>
            </object>
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
