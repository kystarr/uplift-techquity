import * as React from "react";
import { TagBadge } from "./TagBadge";
import { cn } from "@/lib/utils";

export interface BusinessTagsProps extends React.HTMLAttributes<HTMLDivElement> {
  tags: string[];
}

/**
 * Renders a list of tag badges. Re-renders only when `tags` array reference
 * or contents change; children (TagBadge) are memoized.
 */
const BusinessTagsComponent = ({ tags, className, ...props }: BusinessTagsProps) => {
  if (!tags?.length) return null;
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="list"
      aria-label="Business tags"
      {...props}
    >
      {tags.map((tag, index) => (
        <TagBadge key={`${tag}-${index}`} tag={tag} />
      ))}
    </div>
  );
};

export const BusinessTags = React.memo(BusinessTagsComponent);
