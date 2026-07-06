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
}

export type PublicationStatus = "draft" | "published";

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
  created_at: string;
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
  created_at: string;
}

export interface EssayWithPreview extends Essay {
  coverPreviewUrl: string | null;
}
