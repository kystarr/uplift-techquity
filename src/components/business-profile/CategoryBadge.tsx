import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CategoryBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  category: string;
  variant?: "default" | "secondary" | "outline";
}

/**
 * Reusable category badge. Updates when `category` prop changes.
 * Slightly more prominent than tags; use for primary categorization.
 */
const CategoryBadgeComponent = ({
  category,
  variant = "default",
  className,
  ...props
}: CategoryBadgeProps) => (
  <Badge
    variant={variant}
    className={cn("text-xs font-semibold", className)}
    {...props}
  >
    {category}
  </Badge>
);

export const CategoryBadge = React.memo(CategoryBadgeComponent);
