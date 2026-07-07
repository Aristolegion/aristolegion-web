import { createAristolegionEmail } from "@/lib/emailTemplates";
import { excerptFromMarkdown } from "@/lib/markdown";
import type { Essay, NewsletterIssue, Publication } from "@/lib/sanctum/types";

const SITE_URL = "https://www.aristolegion.com";

export interface EmailContent {
  subject: string;
  html: string;
}

/**
 * One function per content type builds the exact subject/HTML pair used by
 * both the real "send to subscribers" endpoints and the "send test email"
 * endpoints, so a preview always matches what subscribers actually receive.
 */
export function buildPublicationEmailContent(publication: Publication): EmailContent {
  const url = `${SITE_URL}/library/${publication.slug}`;

  return {
    subject: `New Aristolegion Publication: ${publication.title}`,
    html: createAristolegionEmail({
      eyebrow: "INTELLIGENCE PUBLICATION",
      title: publication.title,
      body: publication.description,
      buttonText: "Explore Intelligence →",
      buttonUrl: url,
    }),
  };
}

export function buildEssayEmailContent(essay: Essay): EmailContent {
  const url = `${SITE_URL}/essays/${essay.slug}`;
  const excerpt = excerptFromMarkdown(essay.content);

  return {
    subject: `New Aristolegion Essay: ${essay.title}`,
    html: createAristolegionEmail({
      eyebrow: "NEW ESSAY",
      title: essay.title,
      body: excerpt,
      buttonText: "Read Perspective →",
      buttonUrl: url,
    }),
  };
}

export function buildNewsletterIssueEmailContent(issue: NewsletterIssue): EmailContent {
  const url = `${SITE_URL}/newsletter/${issue.slug}`;
  const excerpt = excerptFromMarkdown(issue.content);
  const monthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
  const metadata = issue.issue_number ? `ISSUE ${issue.issue_number.toUpperCase()} • ${monthYear}` : undefined;

  return {
    subject: `${issue.title} — Aristolegion Newsletter`,
    html: createAristolegionEmail({
      eyebrow: "ARISTOLEGION DISPATCH",
      metadata,
      title: issue.title,
      subtitle: issue.subtitle,
      body: excerpt,
      buttonText: "Open Dispatch →",
      buttonUrl: url,
    }),
  };
}
