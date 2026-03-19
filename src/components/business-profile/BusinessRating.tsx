import * as React from "react";
import { RatingDisplay } from "./RatingDisplay";
import { cn } from "@/lib/utils";

export interface BusinessRatingProps extends React.HTMLAttributes<HTMLDivElement> {
  averageRating: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Wrapper around RatingDisplay for business context. Memoized to prevent
 * re-renders when parent updates with same rating/reviewCount.
 */
const BusinessRatingComponent = ({
  averageRating,
  reviewCount,
  size = "md",
  className,
  ...props
}: BusinessRatingProps) => (
  <RatingDisplay
    averageRating={averageRating}
    reviewCount={reviewCount}
    size={size}
    showNumeric
    className={cn(className)}
    {...props}
  />
);

export const BusinessRating = React.memo(BusinessRatingComponent);
