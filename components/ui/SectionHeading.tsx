import type { ReactNode } from "react";
import type { SectionBackground } from "@/lib/content/types";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: SectionBackground;
  className?: string;
}

const headingToneClasses: Record<SectionBackground, string> = {
  navy: "text-ivory",
  ivory: "text-charcoal",
};

const descriptionToneClasses: Record<SectionBackground, string> = {
  navy: "text-ivory-muted",
  ivory: "text-charcoal/70",
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "ivory",
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
      <h2
        className={`font-display text-balance text-3xl font-semibold md:text-5xl ${headingToneClasses[tone]}`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-6 max-w-2xl font-body text-base ${descriptionToneClasses[tone]}`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
