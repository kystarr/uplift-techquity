import * as React from "react";
import { cn } from "@/lib/utils";

type ContainerMaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "7xl" | "full";

const maxWidthClasses: Record<ContainerMaxWidth, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the inner content. Default: no max (full container width). */
  maxWidth?: ContainerMaxWidth;
  /** Extra padding. Default: py-8 */
  padding?: "none" | "sm" | "default" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "py-6",
  default: "py-10",
  lg: "py-14",
};

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, maxWidth, padding = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {maxWidth ? (
        <div className={cn("mx-auto", maxWidthClasses[maxWidth])}>{children}</div>
      ) : (
        children
      )}
    </div>
  )
);
Container.displayName = "Container";
