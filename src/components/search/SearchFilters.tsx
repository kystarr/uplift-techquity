import * as React from "react";
import { Star, X, Loader2, Navigation } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onGeocodeZip: (zip: string) => Promise<void>;
}

/**
 * Slide-over filter panel for the search/discover page.
 * When Distance sort is selected users can share GPS location OR type a zip code.
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
  onGeocodeZip,
}: SearchFiltersProps) {
  const [draft, setDraft] = React.useState<SearchFilterState>(filters);
  const [zipInput, setZipInput] = React.useState('');
  const [zipMode, setZipMode] = React.useState(false);

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
      // Don't auto-prompt GPS; let the user choose GPS vs zip
    }
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (zipInput.trim()) {
      await onGeocodeZip(zipInput.trim());
    }
  };

  const applyFilters = () => {
    onFiltersChange(draft);
    onOpenChange(false);
  };

  const resetFilters = () => {
    const reset: SearchFilterState = { selectedCategories: [], minRating: 0, sortBy: 'relevance' };
    setDraft(reset);
    setZipInput('');
    setZipMode(false);
    onFiltersChange(reset);
  };

  const activeCount =
    (draft.selectedCategories.length > 0 ? 1 : 0) +
    (draft.minRating > 0 ? 1 : 0) +
    (draft.sortBy !== 'relevance' ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[28rem] flex flex-col glass-panel-strong">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Filters {activeCount > 0 && <Badge>{activeCount}</Badge>}
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
                <Label htmlFor="sort-rating" className="cursor-pointer">Rating: High to Low</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="distance" id="sort-distance" />
                <Label htmlFor="sort-distance" className="cursor-pointer">Distance</Label>
              </div>
            </RadioGroup>

            {draft.sortBy === 'distance' && (
              <div className="ml-6 space-y-3">
                {hasLocation ? (
                  <p className="text-xs text-success flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> Location set
                  </p>
                ) : (
                  <>
                    {/* Toggle between GPS and zip */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={zipMode ? 'outline' : 'default'}
                        className="h-7 text-xs"
                        onClick={() => { setZipMode(false); onRequestLocation(); }}
                        disabled={requestingLocation}
                      >
                        {requestingLocation && !zipMode
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <Navigation className="h-3 w-3 mr-1" />}
                        Use GPS
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={zipMode ? 'default' : 'outline'}
                        className="h-7 text-xs"
                        onClick={() => setZipMode(true)}
                      >
                        Enter zip code
                      </Button>
                    </div>

                    {zipMode && (
                      <form onSubmit={handleZipSubmit} className="flex gap-2">
                        <Input
                          placeholder="e.g. 20001"
                          value={zipInput}
                          onChange={(e) => setZipInput(e.target.value)}
                          maxLength={5}
                          className="h-8 text-sm w-28"
                          inputMode="numeric"
                        />
                        <Button type="submit" size="sm" className="h-8 text-xs" disabled={requestingLocation}>
                          {requestingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Go'}
                        </Button>
                      </form>
                    )}
                  </>
                )}

                {locationError && (
                  <p className="text-xs text-destructive">{locationError}</p>
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
                    setDraft((prev) => ({ ...prev, minRating: prev.minRating === star ? 0 : star }))
                  }
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      star <= draft.minRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
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
              <p className="text-xs text-muted-foreground">Showing {draft.minRating}+ stars</p>
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

        <SheetFooter className="flex-row gap-2 pt-4 border-t border-white/20">
          <Button variant="outline" className="flex-1" onClick={resetFilters}>Reset</Button>
          <Button className="flex-1" onClick={applyFilters}>Apply</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
