import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/shared";
import { cn } from "@/lib/utils";

/**
 * Loading skeleton for the business profile page. Matches the layout structure
 * (breadcrumb, header block, gallery grid, description, contact + reviews)
 * to prevent layout shift when data loads.
 */
export function BusinessProfileSkeleton({ className }: { className?: string }) {
  return (
    <Container maxWidth="4xl" padding="default" className={cn(className)}>
      <nav className="mb-6">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-9 w-20" />
      </nav>

      {/* Header area */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
        ))}
      </div>

      {/* Description */}
      <div className="mt-8 space-y-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Contact + Reviews area */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </Container>
  );
}
