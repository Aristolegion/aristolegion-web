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
