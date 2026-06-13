import type { ReactNode } from "react";
import type { SectionBackground } from "@/lib/content/types";

interface SectionProps {
  id?: string;
  background?: SectionBackground;
  children: ReactNode;
  className?: string;
  withTopRule?: boolean;
}

const backgroundClasses: Record<SectionBackground, string> = {
  navy: "bg-navy text-ivory",
  ivory: "bg-ivory text-charcoal",
};

export function Section({
  id,
  background = "ivory",
  children,
  className = "",
  withTopRule = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-20 md:py-28 lg:py-32 ${backgroundClasses[background]} ${className}`}
    >
      {withTopRule && <hr className="gold-rule mb-0" aria-hidden="true" />}
      {children}
    </section>
  );
}
