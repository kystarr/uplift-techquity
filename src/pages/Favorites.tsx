import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Container, EmptyState } from "@/components/shared";
import { Navigation } from "@/components/Navigation";
import { BusinessCard } from "@/components/BusinessCard";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";

const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { favorites, loading, toggleFavorite } = useFavorites();

  // Redirect guests to auth
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <Container maxWidth="7xl" className="space-y-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card h-72 animate-pulse"
              />
            ))}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="7xl" className="space-y-8">
        <div className="mt-8">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {favorites.map((fav) => (
              <BusinessCard
                key={fav.favoriteId}
                id={fav.businessId}
                name={fav.businessName}
                category={fav.businessCategory}
                rating={fav.businessRating}
                reviewCount={0}
                distance=""
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
                  })
                }
              />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
};

export default Favorites;
