import { Link } from "react-router-dom";
import { BusinessCard } from "@/components/BusinessCard";
import { useFavorites } from "@/hooks/useFavorites";
import { EmptyState } from "@/components/shared";
import { Heart, Loader2 } from "lucide-react";

export function FavoritesTab() {
  const { favorites, loading, toggleFavorite } = useFavorites();

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
    <div>
      <h1 className="text-2xl font-semibold mb-6">Favorites</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((f) => (
          <BusinessCard
            key={f.favoriteId}
            id={f.businessId}
            name={f.businessName}
            category={f.businessCategory}
            image={f.businessImage}
            rating={f.businessRating}
            verified={f.businessVerified}
            distance=""
            tags={[]}
            isFavorite
            onToggleFavorite={() =>
              toggleFavorite({
                id: f.businessId,
                name: f.businessName,
                category: f.businessCategory,
                image: f.businessImage,
                rating: f.businessRating,
                verified: f.businessVerified,
                latitude: f.businessLatitude,
                longitude: f.businessLongitude,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
