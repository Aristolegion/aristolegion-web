import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface PublicationAccessAction {
  label: string;
  href: string;
  external?: boolean;
}

interface PublicationAccessProps {
  primaryAction?: PublicationAccessAction;
  secondaryAction?: PublicationAccessAction;
}

// Unavailable actions are omitted entirely rather than shown disabled —
// consistent with how the rest of the site degrades gracefully when
// Sanctum content is missing a field (e.g. LatestIntelligence, Library).
export function PublicationAccess({ primaryAction, secondaryAction }: PublicationAccessProps) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <Section background="ivory">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            eyebrow="Access"
            title="Access the Complete Publication"
            description="The complete Aristolegion Intelligence publication includes deeper analysis, framework breakdowns, and strategic implications."
            tone="ivory"
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {primaryAction && (
              <Button href={primaryAction.href} external={primaryAction.external} variant="primary">
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                href={secondaryAction.href}
                external={secondaryAction.external}
                variant="secondary"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
