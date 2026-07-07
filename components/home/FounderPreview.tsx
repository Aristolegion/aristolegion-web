import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { LinkedInBadge } from "@/components/LinkedInBadge";
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
            <div className="mt-6">
              <Link
                href={founder.href}
                className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-navy"
              >
                Read the Founder&apos;s Story →
              </Link>
            </div>
            <div className="mt-10">
              <LinkedInBadge />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
