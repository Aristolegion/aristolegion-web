import Image from "next/image";
import { founder } from "@/lib/content/homepage";

// Native replacement for LinkedIn's official embeddable badge, whose script
// loaded inconsistently inside Next.js hydration. No external script — just
// a static card matching Aristolegion's visual identity.
export function LinkedInProfileCard() {
  return (
    <div className="flex max-w-sm items-center gap-4 border border-gold bg-navy p-6 sm:gap-5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gold-muted sm:h-20 sm:w-20">
        <Image
          src="/images/founder-uday.png"
          alt=""
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-ivory">{founder.name}</p>
        <p className="mt-0.5 font-body text-xs font-medium uppercase tracking-[0.08em] text-gold">
          {founder.title}
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-ivory-muted">
          Building research, publications, and frameworks around judgment, capability, and human
          excellence.
        </p>
        <a
          href="https://in.linkedin.com/in/aristolegion"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
        >
          Connect on LinkedIn
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
