import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Container, EmptyState } from "@/components/shared";
import { Navigation } from "@/components/Navigation";
import { BusinessCard } from "@/components/BusinessCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserLocation, haversineDistanceMiles } from "@/hooks/useUserLocation";
import { SearchFilters, type SearchFilterState } from "@/components/search/SearchFilters";

const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { favorites, loading, toggleFavorite } = useFavorites();
  const { coords, locationError, hasLocation, requesting, requestLocation, geocodeZip } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterState, setFilterState] = useState<SearchFilterState>({
    selectedCategories: [],
    minRating: 0,
    sortBy: 'relevance',
  });

  // Redirect guests to auth
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const getDistanceLabel = (lat?: number, lon?: number): string => {
    if (!hasLocation || lat == null || lon == null || !coords) return '';
    const miles = haversineDistanceMiles(coords.latitude, coords.longitude, lat, lon);
    return miles < 0.1 ? '< 0.1 mi' : `${miles.toFixed(1)} mi`;
  };

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    favorites.forEach((f) => { if (f.businessCategory) seen.add(f.businessCategory); });
    return Array.from(seen).sort();
  }, [favorites]);

  const filtered = useMemo(() => {
    let list = [...favorites];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.businessName.toLowerCase().includes(q) ||
          f.businessCategory.toLowerCase().includes(q)
      );
    }

    if (filterState.selectedCategories.length > 0) {
      list = list.filter((f) => filterState.selectedCategories.includes(f.businessCategory));
    }

    if (filterState.minRating > 0) {
      list = list.filter((f) => f.businessRating >= filterState.minRating);
    }

    if (filterState.sortBy === 'rating') {
      list.sort((a, b) => b.businessRating - a.businessRating);
    } else if (filterState.sortBy === 'distance' && coords) {
      list.sort((a, b) => {
        const aDist =
          a.businessLatitude != null && a.businessLongitude != null
            ? haversineDistanceMiles(coords.latitude, coords.longitude, a.businessLatitude, a.businessLongitude)
            : Infinity;
        const bDist =
          b.businessLatitude != null && b.businessLongitude != null
            ? haversineDistanceMiles(coords.latitude, coords.longitude, b.businessLatitude, b.businessLongitude)
            : Infinity;
        return aDist - bDist;
      });
    }

    return list;
  }, [favorites, searchQuery, filterState, coords]);

  const activeFilterCount =
    (filterState.selectedCategories.length > 0 ? 1 : 0) +
    (filterState.minRating > 0 ? 1 : 0) +
    (filterState.sortBy !== 'relevance' ? 1 : 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <Container maxWidth="7xl">
          <div className="mt-8 mb-6">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="7xl">
        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Your Favorites</h1>
          <p className="text-muted-foreground mt-1">
            Businesses you've saved for later
          </p>
        </div>

        {favorites.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            description="You haven't saved any businesses yet."
            action={
              <Link
                to="/search"
                className="text-primary underline underline-offset-4 hover:opacity-80 text-sm"
              >
                Discover businesses →
              </Link>
            }
          />
        ) : (
          <>
            {/* Search + Filter bar */}
            <div className="flex gap-3 mb-8">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search your favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Button
                variant={activeFilterCount > 0 ? 'default' : 'outline'}
                size="lg"
                className="h-11"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  No favorites match your search or filters.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {filtered.map((fav) => (
                  <BusinessCard
                    key={fav.favoriteId}
                    id={fav.businessId}
                    name={fav.businessName}
                    category={fav.businessCategory}
                    rating={fav.businessRating}
                    distance={getDistanceLabel(fav.businessLatitude, fav.businessLongitude)}
                    image={
                      fav.businessImage ||
                      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
                    }
                    tags={[]}
                    verified={fav.businessVerified}
                    isFavorite={true}
                    onToggleFavorite={() =>
                      toggleFavorite({
                        id: fav.businessId,
                        name: fav.businessName,
                        category: fav.businessCategory,
                        image: fav.businessImage,
                        rating: fav.businessRating,
                        verified: fav.businessVerified,
                        latitude: fav.businessLatitude,
                        longitude: fav.businessLongitude,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Container>

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
};

export default Favorites;
