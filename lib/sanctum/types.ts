export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface InnerCircleApplication {
  id: string;
  full_name: string;
  email: string;
  role_title: string;
  why_join: string;
  capability_goal: string;
  contribution: string;
  status: string;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  consent: boolean;
  source: string | null;
  created_at: string;
  unsubscribe_token: string;
  unsubscribed_at: string | null;
}

export type PublicationStatus = "draft" | "published";

export interface PublicationKeyInsight {
  title: string;
  description: string;
}

export interface PublicationFramework {
  title: string;
  steps: string[];
}

export interface Publication {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  pdf_url: string | null;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
  /** Editorial metadata — optional; falls back to generated/curated content when absent. See lib/content/publicationEnhancements.ts. */
  intelligence_brief: string | null;
  central_question: string | null;
  key_insights: PublicationKeyInsight[] | null;
  framework: PublicationFramework | null;
}

export interface PublicationWithPreview extends Publication {
  pdfPreviewUrl: string | null;
  coverPreviewUrl: string | null;
}

export type EssayStatus = "draft" | "published";

export interface Essay {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  status: string;
  linkedin_url: string | null;
  published_at: string | null;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

export interface EssayWithPreview extends Essay {
  coverPreviewUrl: string | null;
}

export type NewsletterIssueStatus = "draft" | "published";

export interface NewsletterIssue {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  issue_number: string;
  content: string;
  cover_image_url: string | null;
  status: string;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

export interface NewsletterIssueWithPreview extends NewsletterIssue {
  coverPreviewUrl: string | null;
}
