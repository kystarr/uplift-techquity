import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, BadgeCheck, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BusinessSummaryCardProps {
  /** Business name */
  name: string;
  /** Category (e.g. "Beauty & Wellness", "Restaurant") */
  category: string;
  /** Rating from 0–5 */
  rating: number;
  /** Optional review count for context */
  reviewCount?: number;
  /** Tags (e.g. ["Natural Hair", "Braiding"]) */
  tags: string[];
  /** Whether the business is verified */
  verified: boolean;
  /** Optional image URL; card still works without it */
  image?: string;
  /** Optional distance/location line */
  distance?: string;
  /** Optional class for the root card */
  className?: string;
  /** Optional click handler (e.g. navigate to detail) */
  onClick?: () => void;
  /** Opens messaging with this business; shown as a secondary action so it does not require onClick. */
  onMessage?: () => void;
}

export const BusinessSummaryCard = ({
  name,
  category,
  rating,
  reviewCount,
  tags,
  verified,
  image,
  distance,
  className,
  onClick,
  onMessage,
}: BusinessSummaryCardProps) => {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md border-border bg-card text-card-foreground",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {image && (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
          />
          {verified && (
            <span
              className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-success/95 px-2 py-1 text-xs font-medium text-success-foreground"
              aria-label="Verified business"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>
      )}

      <CardContent className={cn("p-4", !image && "pt-4")}>
        {!image && verified && (
          <div className="mb-2">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
              aria-label="Verified business"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{category}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            {rating.toFixed(1)}
          </span>
          {reviewCount != null && (
            <span className="text-muted-foreground">({reviewCount} reviews)</span>
          )}
          {distance != null && (
            <span className="text-muted-foreground">{distance}</span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {onMessage && (
          <div
            className="mt-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={onMessage}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Message owner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
