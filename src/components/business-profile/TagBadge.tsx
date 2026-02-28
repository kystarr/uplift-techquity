import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TagBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  tag: string;
  variant?: "default" | "secondary" | "outline";
}

/**
 * Reusable tag badge. Updates when `tag` prop changes.
 * Use for business tags across profile, cards, and search.
 */
const TagBadgeComponent = ({ tag, variant = "secondary", className, ...props }: TagBadgeProps) => (
  <Badge
    variant={variant}
    className={cn("text-xs font-medium", className)}
    {...props}
  >
    {tag}
  </Badge>
);

export const TagBadge = React.memo(TagBadgeComponent);
