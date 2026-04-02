import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BusinessCard } from "@/components/BusinessCard";
import { useFavorites } from "@/hooks/useFavorites";
import { useBusinessSearch, type BusinessSearchResult } from "@/hooks/useBusinessSearch";
import { useUserLocation, haversineDistanceMiles } from "@/hooks/useUserLocation";
import { EmptyState } from "@/components/shared";
import { Heart, Loader2 } from "lucide-react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop";

export function FavoritesTab() {
  const { favorites, loading: favLoading, toggleFavorite } = useFavorites();
  const { businesses, loading: bizLoading } = useBusinessSearch();
  const { coords, hasLocation, requestLocation } = useUserLocation();

  const businessById = useMemo(() => {
    const m = new Map<string, BusinessSearchResult>();
    businesses.forEach((b) => m.set(b.id, b));
    return m;
  }, [businesses]);

  const rows = useMemo(() => {
    return favorites.map((f) => {
      const full = businessById.get(f.businessId);
      return { favorite: f, full };
    });
  }, [favorites, businessById]);

  const getDistanceLabel = (lat?: number, lon?: number): string => {
    if (!hasLocation || lat == null || lon == null || !coords) return "";
    const miles = haversineDistanceMiles(coords.latitude, coords.longitude, lat, lon);
    return miles < 0.1 ? "< 0.1 mi" : `${miles.toFixed(1)} mi`;
  };

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

  return (
    <div className="space-y-6">
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
            to see distance to each business.
          </p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map(({ favorite: f, full }) => {
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
    </div>
  );
}
