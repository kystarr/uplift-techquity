import * as React from "react";
import { Star, X, MapPin, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SortOption = 'relevance' | 'rating' | 'distance';

export interface SearchFilterState {
  selectedCategories: string[];
  minRating: number;
  sortBy: SortOption;
}

interface SearchFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCategories: string[];
  filters: SearchFilterState;
  onFiltersChange: (filters: SearchFilterState) => void;
  hasLocation: boolean;
  requestingLocation: boolean;
  locationError: string | null;
  onRequestLocation: () => void;
}

/**
 * Slide-over filter panel for the search/discover page.
 * Categories are derived from currently-loaded businesses.
 */
export function SearchFilters({
  open,
  onOpenChange,
  availableCategories,
  filters,
  onFiltersChange,
  hasLocation,
  requestingLocation,
  locationError,
  onRequestLocation,
}: SearchFiltersProps) {
  const [draft, setDraft] = React.useState<SearchFilterState>(filters);

  // Sync draft when sheet opens
  React.useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggleCategory = (cat: string) => {
    setDraft((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(cat)
        ? prev.selectedCategories.filter((c) => c !== cat)
        : [...prev.selectedCategories, cat],
    }));
  };

  const handleSortChange = (value: SortOption) => {
    setDraft((prev) => ({ ...prev, sortBy: value }));
    if (value === 'distance' && !hasLocation) {
      onRequestLocation();
    }
  };

  const applyFilters = () => {
    onFiltersChange(draft);
    onOpenChange(false);
  };

  const resetFilters = () => {
    const reset: SearchFilterState = {
      selectedCategories: [],
      minRating: 0,
      sortBy: 'relevance',
    };
    setDraft(reset);
    onFiltersChange(reset);
  };

  const activeCount =
    (draft.selectedCategories.length > 0 ? 1 : 0) +
    (draft.minRating > 0 ? 1 : 0) +
    (draft.sortBy !== 'relevance' ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96 flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Filters {activeCount > 0 && <Badge className="ml-2">{activeCount}</Badge>}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Sort By */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Sort By</h3>
            <RadioGroup
              value={draft.sortBy}
              onValueChange={(v) => handleSortChange(v as SortOption)}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="relevance" id="sort-relevance" />
                <Label htmlFor="sort-relevance" className="cursor-pointer">Relevance</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="rating" id="sort-rating" />
                <Label htmlFor="sort-rating" className="cursor-pointer">Rating (high → low)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="distance" id="sort-distance" />
                <Label htmlFor="sort-distance" className="flex items-center gap-1 cursor-pointer">
                  <MapPin className="h-3.5 w-3.5" />
                  Distance (near → far)
                </Label>
              </div>
            </RadioGroup>

            {draft.sortBy === 'distance' && (
              <div className="text-xs pl-6">
                {requestingLocation && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Getting your location…
                  </span>
                )}
                {!requestingLocation && hasLocation && (
                  <span className="text-green-600">Location acquired</span>
                )}
                {!requestingLocation && !hasLocation && !locationError && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onRequestLocation}>
                    Allow location access
                  </Button>
                )}
                {locationError && (
                  <span className="text-destructive">{locationError}</span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Minimum Rating */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Minimum Rating</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star minimum`}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      minRating: prev.minRating === star ? 0 : star,
                    }))
                  }
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      star <= draft.minRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
              {draft.minRating > 0 && (
                <button
                  type="button"
                  aria-label="Clear rating filter"
                  onClick={() => setDraft((prev) => ({ ...prev, minRating: 0 }))}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {draft.minRating > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {draft.minRating}+ stars
              </p>
            )}
          </div>

          <Separator />

          {/* Categories */}
          {availableCategories.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Categories</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {availableCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={draft.selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <Label htmlFor={`cat-${cat}`} className="cursor-pointer text-sm font-normal">
                      {cat}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={resetFilters}>
            Reset
          </Button>
          <Button className="flex-1" onClick={applyFilters}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
