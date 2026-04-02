import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BusinessCard } from "@/components/BusinessCard";
import { useFavorites, type FavoriteBusinessSnapshot } from "@/hooks/useFavorites";
import { useBusinessSearch, type BusinessSearchResult } from "@/hooks/useBusinessSearch";
import { useUserLocation, haversineDistanceMiles } from "@/hooks/useUserLocation";
import { EmptyState } from "@/components/shared";
import { SearchFilters, type SearchFilterState } from "@/components/search/SearchFilters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Search as SearchIcon, SlidersHorizontal } from "lucide-react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop";

type FavoriteRow = {
  favorite: FavoriteBusinessSnapshot;
  full: BusinessSearchResult | undefined;
};

export function FavoritesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterState, setFilterState] = useState<SearchFilterState>({
    selectedCategories: [],
    minRating: 0,
    sortBy: "relevance",
  });

  const { favorites, loading: favLoading, toggleFavorite } = useFavorites();
  const { businesses, loading: bizLoading } = useBusinessSearch();
  const {
    coords,
    hasLocation,
    requestLocation,
    locationError,
    requesting,
    geocodeZip,
  } = useUserLocation();

  const businessById = useMemo(() => {
    const m = new Map<string, BusinessSearchResult>();
    businesses.forEach((b) => m.set(b.id, b));
    return m;
  }, [businesses]);

  const rows: FavoriteRow[] = useMemo(() => {
    return favorites.map((f) => {
      const full = businessById.get(f.businessId);
      return { favorite: f, full };
    });
  }, [favorites, businessById]);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach(({ full, favorite }) => {
      const cat = full?.category ?? favorite.businessCategory;
      if (cat) seen.add(cat);
    });
    return Array.from(seen).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = [...rows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(({ full, favorite }) => {
        const name = (full?.name ?? favorite.businessName).toLowerCase();
        const category = (full?.category ?? favorite.businessCategory).toLowerCase();
        const tags = full?.tags ?? [];
        return (
          name.includes(q) ||
          category.includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    if (filterState.selectedCategories.length > 0) {
      list = list.filter(({ full, favorite }) => {
        const cat = full?.category ?? favorite.businessCategory;
        return filterState.selectedCategories.includes(cat);
      });
    }

    if (filterState.minRating > 0) {
      list = list.filter(({ full, favorite }) => {
        const rating = full?.rating ?? favorite.businessRating;
        return rating >= filterState.minRating;
      });
    }

    if (filterState.sortBy === "rating") {
      list.sort((a, b) => {
        const ra = a.full?.rating ?? a.favorite.businessRating;
        const rb = b.full?.rating ?? b.favorite.businessRating;
        return rb - ra;
      });
    } else if (filterState.sortBy === "distance" && coords) {
      list.sort((a, b) => {
        const latA = a.full?.latitude ?? a.favorite.businessLatitude;
        const lonA = a.full?.longitude ?? a.favorite.businessLongitude;
        const latB = b.full?.latitude ?? b.favorite.businessLatitude;
        const lonB = b.full?.longitude ?? b.favorite.businessLongitude;
        const distA =
          latA != null && lonA != null
            ? haversineDistanceMiles(coords.latitude, coords.longitude, latA, lonA)
            : Infinity;
        const distB =
          latB != null && lonB != null
            ? haversineDistanceMiles(coords.latitude, coords.longitude, latB, lonB)
            : Infinity;
        return distA - distB;
      });
    }

    return list;
  }, [rows, searchQuery, filterState, coords]);

  const getDistanceLabel = (lat?: number, lon?: number): string => {
    if (!hasLocation || lat == null || lon == null || !coords) return "";
    const miles = haversineDistanceMiles(coords.latitude, coords.longitude, lat, lon);
    return miles < 0.1 ? "< 0.1 mi" : `${miles.toFixed(1)} mi`;
  };

  const activeFilterCount =
    (filterState.selectedCategories.length > 0 ? 1 : 0) +
    (filterState.minRating > 0 ? 1 : 0) +
    (filterState.sortBy !== "relevance" ? 1 : 0);

  const loading = favLoading || (favorites.length > 0 && bizLoading);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading favorites…
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No favorites yet"
        description="Save businesses from search to see them here."
        action={
          <Link to="/search" className="text-primary underline text-sm">
            Browse businesses
          </Link>
        }
      />
    );
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 || activeFilterCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Favorites</h1>
          {!hasLocation && (
            <p className="text-sm text-muted-foreground">
              <button
                type="button"
                className="text-primary underline font-medium"
                onClick={() => requestLocation()}
              >
                Share your location
              </button>{" "}
              to sort by distance and see miles on each card.
            </p>
          )}
        </div>
        <Button
          variant={activeFilterCount > 0 ? "default" : "outline"}
          className="shrink-0 self-start"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search your favorites by name, category, or tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {filteredRows.length === 0 && (
        <div className="text-center py-10 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground text-sm">
            {hasActiveFilters
              ? "No favorites match your search or filters."
              : "No favorites to show."}
          </p>
          {hasActiveFilters && (
            <Button
              variant="link"
              className="mt-2"
              onClick={() => {
                setSearchQuery("");
                setFilterState({
                  selectedCategories: [],
                  minRating: 0,
                  sortBy: "relevance",
                });
              }}
            >
              Clear search and filters
            </Button>
          )}
        </div>
      )}

      {filteredRows.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRows.map(({ favorite: f, full }) => {
            const image = full?.image ?? f.businessImage ?? FALLBACK_IMAGE;
            const name = full?.name ?? f.businessName;
            const category = full?.category ?? f.businessCategory;
            const rating = full?.rating ?? f.businessRating;
            const reviewCount = full?.reviewCount ?? 0;
            const tags = full?.tags ?? [];
            const verified = full?.verified ?? f.businessVerified;
            const lat = full?.latitude ?? f.businessLatitude;
            const lon = full?.longitude ?? f.businessLongitude;

            return (
              <BusinessCard
                key={f.favoriteId}
                id={f.businessId}
                name={name}
                category={category}
                rating={rating}
                reviewCount={reviewCount}
                distance={getDistanceLabel(lat, lon)}
                image={image}
                tags={tags}
                verified={verified}
                isFavorite
                onToggleFavorite={() =>
                  toggleFavorite({
                    id: f.businessId,
                    name: f.businessName,
                    category: f.businessCategory,
                    image: f.businessImage || FALLBACK_IMAGE,
                    rating: f.businessRating,
                    verified: f.businessVerified,
                    latitude: f.businessLatitude,
                    longitude: f.businessLongitude,
                  })
                }
              />
            );
          })}
        </div>
      )}

      <SearchFilters
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        availableCategories={availableCategories}
        filters={filterState}
        onFiltersChange={setFilterState}
        hasLocation={hasLocation}
        requestingLocation={requesting}
        locationError={locationError}
        onRequestLocation={requestLocation}
        onGeocodeZip={geocodeZip}
      />
    </div>
  );
}
