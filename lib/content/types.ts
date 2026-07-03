export type SectionBackground = "navy" | "ivory";

export interface NavLink {
  label: string;
  href: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  category: string;
}

export interface InProgressItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

export interface SiteMeta {
  name: string;
  motto: string;
  positioning: string;
  title: string;
  description: string;
}

export interface Founder {
  name: string;
  title: string;
  bio: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export type PublicationCategory =
  | "Novel"
  | "Research Report"
  | "Executive Journal"
  | "Research Framework";

export interface PublicationSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  quote?: string;
}

export interface Publication {
  slug: string;
  title: string;
  subtitle: string;
  category: PublicationCategory;
  author: string;
  publishDate: string;
  readingTime: string;
  coverImage: string;
  excerpt: string;
  sections: PublicationSection[];
}
