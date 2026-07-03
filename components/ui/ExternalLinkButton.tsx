import { Button } from "@/components/ui/Button";

type ExternalLinkButtonVariant = "primary" | "secondary" | "ghost";

interface ExternalLinkButtonProps {
  href: string;
  label: string;
  variant?: ExternalLinkButtonVariant;
  className?: string;
}

export function ExternalLinkButton({
  href,
  label,
  variant = "secondary",
  className = "",
}: ExternalLinkButtonProps) {
  return (
    <Button href={href} external variant={variant} className={className}>
      {label} ↗<span className="sr-only"> (opens in a new tab)</span>
    </Button>
  );
}
