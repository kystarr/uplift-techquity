import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Average rating 0–5 (e.g. 4.9) */
  averageRating: number;
  /** Optional review count for "(234 reviews)" */
  reviewCount?: number;
  /** Size of star icons */
  size?: "sm" | "md" | "lg";
  /** Show numeric value next to stars */
  showNumeric?: boolean;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

/**
 * Reusable rating display: stars + optional numeric + optional review count.
 * Updates when averageRating or reviewCount props change. Memoized to avoid
 * re-renders when parent re-renders with same props.
 */
const RatingDisplayComponent = ({
  averageRating,
  reviewCount,
  size = "md",
  showNumeric = true,
  className,
  ...props
}: RatingDisplayProps) => {
  const safeAverageRating = Number.isFinite(averageRating) ? averageRating : 0;
  const clamped = Math.min(5, Math.max(0, safeAverageRating));
  const safeReviewCount =
    reviewCount != null ? Math.max(0, Math.floor(reviewCount)) : undefined;

  const fullStars = Math.floor(clamped);
  const fractional = clamped % 1;
  const hasHalf = fractional >= 0.25 && fractional < 0.75;
  const starClass = sizeClasses[size];
  const getStarToneClass = (index: number) => {
    if (index < fullStars) {
      return "fill-yellow-500 text-yellow-500";
    }

    if (index === fullStars && hasHalf) {
      return "fill-yellow-500/50 text-yellow-500/50";
    }

    return "text-muted fill-muted/30";
  };

  return (
    <div
      className={cn("flex items-center gap-1.5 flex-wrap", className)}
      role="img"
      aria-label={`Rating: ${clamped.toFixed(1)} out of 5${safeReviewCount != null ? `, ${safeReviewCount} reviews` : ""}`}
      {...props}
    >
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(starClass, getStarToneClass(i))}
            aria-hidden
          />
        ))}
      </div>
      {showNumeric && (
        <span className="font-medium text-foreground text-sm">
          {clamped.toFixed(1)}
        </span>
      )}
      {safeReviewCount != null && safeReviewCount > 0 && (
        <span className="text-muted-foreground text-sm">({safeReviewCount})</span>
      )}
    </div>
  );
};

export const RatingDisplay = React.memo(RatingDisplayComponent);
