import { PageShell } from "@/components/layout/PageShell";
import { InProgress } from "@/components/home/InProgress";
import { FeaturedEssays } from "@/components/home/FeaturedEssays";
import { FounderPreview } from "@/components/home/FounderPreview";
import { Hero } from "@/components/home/Hero";
import { InnerCircleInvitation } from "@/components/home/InnerCircleInvitation";
import { LatestIntelligence } from "@/components/home/LatestIntelligence";
import { Library } from "@/components/home/Library";
import { ManifestoPreview } from "@/components/home/ManifestoPreview";
import { Newsletter } from "@/components/home/Newsletter";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <PageShell>
      <Hero />
      <ManifestoPreview />
      <Library />
      <InProgress />
      <FeaturedEssays />
      <LatestIntelligence />
      <FounderPreview />
      <InnerCircleInvitation />
      <Newsletter />
    </PageShell>
  );
}
