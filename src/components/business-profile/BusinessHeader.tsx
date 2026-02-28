import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { BusinessRating } from "./BusinessRating";
import { BusinessTags } from "./BusinessTags";
import { CategoryBadge } from "./CategoryBadge";
import { cn } from "@/lib/utils";

export interface BusinessHeaderProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  isVerified: boolean;
  averageRating: number;
  reviewCount?: number;
  categories: string[];
  tags: string[];
}

/**
 * Header section for public business profile: name, verification badge,
 * rating, categories, and tags. Uses memoized subcomponents so metadata
 * updates (e.g. after edit) don’t cause unnecessary re-renders elsewhere.
 */
const BusinessHeaderComponent = ({
  name,
  isVerified,
  averageRating,
  reviewCount,
  categories,
  tags,
  className,
  ...props
}: BusinessHeaderProps) => (
  <header
    className={cn("space-y-4", className)}
    aria-label="Business overview"
    {...props}
  >
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="text-2xl sm:text-3xl font-bold text-default-heading pr-2">
        {name}
      </h1>
      {isVerified && (
        <Badge
          className="bg-success text-success-foreground gap-1"
          aria-label="Verified business"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Verified
        </Badge>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-4">
      <BusinessRating
        averageRating={averageRating}
        reviewCount={reviewCount}
        size="md"
      />
      {categories?.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Categories">
          {categories.map((cat) => (
            <CategoryBadge key={cat} category={cat} />
          ))}
        </div>
      )}
    </div>

    {tags?.length > 0 && <BusinessTags tags={tags} />}
  </header>
);

export const BusinessHeader = React.memo(BusinessHeaderComponent);
