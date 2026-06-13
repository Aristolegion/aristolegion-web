import type { ReactNode } from "react";

type ContainerSize = "default" | "wide";

interface ContainerProps {
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
}

const sizeClasses: Record<ContainerSize, string> = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
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
