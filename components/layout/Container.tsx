import type { ReactNode } from "react";

type ContainerSize = "default" | "wide";

interface ContainerProps {
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
}

// PRD-locked layout grid: 1280px content width, 1440px page max width.
const sizeClasses: Record<ContainerSize, string> = {
  default: "max-w-7xl",
  wide: "max-w-[1440px]",
};

export function Container({
  children,
  size = "default",
  className = "",
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-6 md:px-10 lg:px-16 ${sizeClasses[size]} ${className}`}
    >
      {children}
    </div>
  );
}
