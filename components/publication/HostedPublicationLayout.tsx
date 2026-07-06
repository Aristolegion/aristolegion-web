import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Publication } from "@/lib/sanctum/types";

interface HostedPublicationLayoutProps {
  publication: Publication;
  pdfPreviewUrl: string | null;
  pdfDownloadUrl: string | null;
  coverUrl: string | null;
}

const PREVIEW_UNAVAILABLE_MESSAGE = "Publication preview is temporarily unavailable.";

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
  pdfPreviewUrl,
  pdfDownloadUrl,
  coverUrl,
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

          <div className="mt-10 grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
            <div className="relative aspect-[3/4] overflow-hidden border border-gold-muted bg-charcoal md:order-2">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={publication.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <Eyebrow>{publication.category}</Eyebrow>
                </div>
              )}
            </div>

            <div className="md:order-1">
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
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {pdfPreviewUrl && pdfDownloadUrl ? (
                  <>
                    <Button href={pdfPreviewUrl} external variant="primary">
                      Read ↗
                    </Button>
                    <Button href={pdfDownloadUrl} external variant="secondary">
                      Download PDF ↓
                    </Button>
                  </>
                ) : (
                  <p className="font-body text-sm text-ivory-muted">{PREVIEW_UNAVAILABLE_MESSAGE}</p>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section background="ivory">
        <Container>
          <div className="mx-auto max-w-4xl border border-charcoal/15">
            {pdfPreviewUrl && pdfDownloadUrl ? (
              <object
                data={pdfPreviewUrl}
                type="application/pdf"
                className="h-[80vh] w-full"
                aria-label={`${publication.title} PDF`}
              >
                <p className="p-8 text-center font-body text-sm text-charcoal/70">
                  Your browser can&apos;t display the PDF inline.{" "}
                  <a
                    href={pdfDownloadUrl}
                    className="font-medium text-gold underline underline-offset-4"
                  >
                    Download it instead
                  </a>
                  .
                </p>
              </object>
            ) : (
              <p className="p-16 text-center font-body text-sm text-charcoal/70">
                {PREVIEW_UNAVAILABLE_MESSAGE}
              </p>
            )}
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
