interface DividerProps {
  variant?: "gold" | "muted";
  className?: string;
}

export function Divider({ variant = "gold", className = "" }: DividerProps) {
  const variantClass = variant === "gold" ? "gold-rule" : "gold-rule-muted";

  return <hr className={`${variantClass} ${className}`} aria-hidden="true" />;
}
