import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { founder } from "@/lib/content/homepage";

export function FounderPreview() {
  return (
    <Section id="founder" background="ivory">
      <Container>
        <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden border border-gold-muted md:order-2">
            <Image
              src="/images/founder-uday.png"
              alt={founder.name}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 480px, 100vw"
            />
          </div>
          <div className="md:order-1">
            <SectionHeading eyebrow="The Founder" title={founder.name} tone="ivory" />
            <p className="mt-2 font-body text-sm font-medium uppercase tracking-[0.1em] text-gold">
              {founder.title}
            </p>
            <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-charcoal/70">
              {founder.bio}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
