import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { InProgress } from "@/components/home/InProgress";
import { FeaturedEssays } from "@/components/home/FeaturedEssays";
import { FounderPreview } from "@/components/home/FounderPreview";
import { Hero } from "@/components/home/Hero";
import { InnerCircleInvitation } from "@/components/home/InnerCircleInvitation";
import { Library } from "@/components/home/Library";
import { ManifestoPreview } from "@/components/home/ManifestoPreview";

export default function Home() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <ManifestoPreview />
        <Library />
        <InProgress />
        <FeaturedEssays />
        <FounderPreview />
        <InnerCircleInvitation />
      </main>
      <SiteFooter />
    </>
  );
}
