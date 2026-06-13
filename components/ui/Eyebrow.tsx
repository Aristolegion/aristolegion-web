import type { ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  className?: string;
  variant?: "gold" | "muted";
}

export function Eyebrow({
  children,
  className = "",
  variant = "gold",
}: EyebrowProps) {
  const colorClass = variant === "gold" ? "text-gold" : "text-ivory-muted";

  return (
    <p
      className={`font-body text-xs font-medium uppercase tracking-[0.15em] ${colorClass} ${className}`}
    >
      {children}
    </p>
  );
}
