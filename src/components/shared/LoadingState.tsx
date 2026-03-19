import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of skeleton lines/cards to show. Default: 6 */
  lines?: number;
  /** Use card-style skeletons instead of lines */
  variant?: "lines" | "cards";
  /** Number of card placeholders when variant is "cards". Default: 6 */
  cardCount?: number;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, lines = 6, variant = "lines", cardCount = 6, ...props }, ref) => {
    if (variant === "cards") {
      return (
        <div
          ref={ref}
          className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", className)}
          {...props}
        >
          {Array.from({ length: cardCount }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-4",
              i === 0 && "w-full",
              i === 1 && "w-5/6",
              i === 2 && "w-4/5",
              i > 2 && "w-full"
            )}
          />
        ))}
      </div>
    );
  }
);
LoadingState.displayName = "LoadingState";
