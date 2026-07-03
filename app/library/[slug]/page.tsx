import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationLayout } from "@/components/publication/PublicationLayout";
import { getPublication, publications } from "@/lib/content/library";

export const dynamicParams = false;

export function generateStaticParams() {
  return publications.map((publication) => ({ slug: publication.slug }));
}

interface PublicationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const publication = getPublication(slug);

  if (!publication) {
    return {};
  }

  return {
    title: `${publication.title} — Aristolegion Library`,
    description: publication.excerpt,
    authors: [{ name: publication.author }],
    openGraph: {
      title: publication.title,
      description: publication.excerpt,
      type: "article",
      publishedTime: publication.publishDate,
      authors: [publication.author],
      images: [publication.coverImage],
    },
  };
}

export default async function PublicationPage({
  params,
}: PublicationPageProps) {
  const { slug } = await params;
  const publication = getPublication(slug);

  if (!publication) {
    notFound();
  }

  return <PublicationLayout publication={publication} />;
}
