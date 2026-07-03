import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  className?: string;
  external?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "inline-flex h-12 items-center justify-center rounded-xl border border-gold bg-gold px-6 font-body text-sm font-medium tracking-wide text-navy transition-colors duration-200 hover:bg-transparent hover:text-gold",
  secondary:
    "inline-flex h-12 items-center justify-center rounded-xl border border-gold px-6 font-body text-sm font-medium tracking-wide text-gold transition-colors duration-200 hover:bg-gold hover:text-navy",
  ghost:
    "inline-flex items-center justify-center font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold",
};

export function Button({
  children,
  href,
  variant = "primary",
  className = "",
  external = false,
}: ButtonProps) {
  const classes = `${variantClasses[variant]} ${className}`;

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
