import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EssayLayout } from "@/components/essay/EssayLayout";
import { essays, getEssay } from "@/lib/content/essays";

export const dynamicParams = false;

export function generateStaticParams() {
  return essays.map((essay) => ({ slug: essay.slug }));
}

interface EssayPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EssayPageProps): Promise<Metadata> {
  const { slug } = await params;
  const essay = getEssay(slug);

  if (!essay) {
    return {};
  }

  return {
    title: `${essay.title} — Aristolegion Essays`,
    description: essay.excerpt,
    authors: [{ name: essay.author }],
    alternates: {
      canonical: `https://aristolegion.com/essays/${essay.slug}`,
    },
    openGraph: {
      title: essay.title,
      description: essay.excerpt,
      type: "article",
      publishedTime: essay.publishDate,
      authors: [essay.author],
    },
  };
}

export default async function EssayPage({ params }: EssayPageProps) {
  const { slug } = await params;
  const essay = getEssay(slug);

  if (!essay) {
    notFound();
  }

  return <EssayLayout essay={essay} />;
}
