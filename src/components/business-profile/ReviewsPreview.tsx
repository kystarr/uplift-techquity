import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingDisplay } from "./RatingDisplay";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewPreviewItem {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date: string;
}

export interface ReviewsPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** First N reviews to show */
  reviews: ReviewPreviewItem[];
  averageRating: number;
  totalCount: number;
  /** Callback when "View all" is clicked (e.g. scroll to section or navigate) */
  onViewAll?: () => void;
}

/**
 * Reviews preview section: summary + first few reviews. Updates when
 * reviews, averageRating, or totalCount props change.
 */
const ReviewsPreviewComponent = ({
  reviews,
  averageRating,
  totalCount,
  onViewAll,
  className,
  ...props
}: ReviewsPreviewProps) => (
  <Card className={cn(className)} {...props}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-lg flex items-center gap-2">
        <MessageSquare className="h-5 w-5" aria-hidden />
        Reviews
      </CardTitle>
      <RatingDisplay averageRating={averageRating} reviewCount={totalCount} size="sm" />
    </CardHeader>
    <CardContent className="space-y-4">
      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reviews yet.</p>
      ) : (
        <ul className="space-y-4" role="list" aria-label="Recent reviews">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-muted pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-foreground">{r.authorName}</span>
                <RatingDisplay averageRating={r.rating} size="sm" showNumeric={false} />
                <span className="text-muted-foreground text-xs">{r.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </li>
          ))}
        </ul>
      )}
      {totalCount > reviews.length && onViewAll && (
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View all {totalCount} reviews
        </Button>
      )}
    </CardContent>
  </Card>
);

export const ReviewsPreview = React.memo(ReviewsPreviewComponent);
