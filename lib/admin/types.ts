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
