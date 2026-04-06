import { BusinessSummaryCard } from "./BusinessSummaryCard";
import type { BusinessSummaryData } from "@/types/business";
import { cn } from "@/lib/utils";

export interface BusinessCardGridProps {
  /** Array of business data to render. Renders nothing when empty. */
  businesses: BusinessSummaryData[];
  /** Called when a card is clicked; receives the business id. */
  onCardClick?: (id: string) => void;
  /** Called when the user chooses “Message owner” on a card. */
  onMessageClick?: (business: BusinessSummaryData) => void;
  /** Optional class for the grid container. */
  className?: string;
  /** Grid layout: "grid" (default) or "list". */
  layout?: "grid" | "list";
}

/**
 * Renders a list of businesses as summary cards. Use with any array of BusinessSummaryData
 * (e.g. from API, search results, or static data).
 */
export const BusinessCardGrid = ({
  businesses,
  onCardClick,
  onMessageClick,
  className,
  layout = "grid",
}: BusinessCardGridProps) => {
  if (businesses.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        layout === "grid" && "grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
        layout === "list" && "flex flex-col gap-4",
        className
      )}
      role="list"
    >
      {businesses.map((business) => (
        <div key={business.id} role="listitem">
          <BusinessSummaryCard
            name={business.name}
            category={business.category}
            rating={business.rating}
            reviewCount={business.reviewCount}
            distance={business.distance}
            image={business.image}
            tags={business.tags}
            verified={business.verified}
            onClick={
              onCardClick
                ? () => onCardClick(business.id)
                : undefined
            }
            onMessage={
              onMessageClick ? () => onMessageClick(business) : undefined
            }
          />
        </div>
      ))}
    </div>
  );
};
