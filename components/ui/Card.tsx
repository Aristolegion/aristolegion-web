import Link from "next/link";
import type { ReactNode } from "react";
import type { SectionBackground } from "@/lib/content/types";

interface CardProps {
  children: ReactNode;
  href?: string;
  tone?: SectionBackground;
  className?: string;
}

const toneClasses: Record<SectionBackground, string> = {
  navy: "border-gold-muted bg-charcoal",
  ivory: "border-charcoal/15 bg-ivory",
};

export function Card({
  children,
  href,
  tone = "navy",
  className = "",
}: CardProps) {
  const classes = `h-full overflow-hidden border transition-all duration-300 ${toneClasses[tone]} ${
    href ? "hover:-translate-y-1 hover:border-gold" : ""
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={`group block ${classes}`}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
