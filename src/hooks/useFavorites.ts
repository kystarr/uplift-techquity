import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';

export interface FavoriteBusinessSnapshot {
  /** Amplify Favorite record id */
  favoriteId: string;
  businessId: string;
  businessName: string;
  businessCategory: string;
  businessImage: string;
  businessRating: number;
  businessVerified: boolean;
}

export interface UseFavoritesResult {
  /** Set of businessIds that the current user has favorited */
  favoriteIds: Set<string>;
  /** Full snapshots for rendering the Favorites page */
  favorites: FavoriteBusinessSnapshot[];
  loading: boolean;
  toggleFavorite: (business: {
    id: string;
    name: string;
    category: string;
    image: string;
    rating: number;
    verified: boolean;
  }) => Promise<void>;
}

/**
 * Manages the current user's favorites.
 *
 * - For unauthenticated users, returns empty state and a no-op toggleFavorite.
 * - For authenticated users, persists favorites to the Amplify Favorite model.
 */
export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteBusinessSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    try {
      await getCurrentUser(); // throws if not signed in
      setIsAuthenticated(true);
      const res = await (amplifyDataClient.models as any).Favorite.list({
        authMode: 'userPool',
      });
      const data: any[] = res.data ?? [];
      setFavorites(
        data.map((f: any): FavoriteBusinessSnapshot => ({
          favoriteId: f.id,
          businessId: f.businessId,
          businessName: f.businessName ?? '',
          businessCategory: f.businessCategory ?? '',
          businessImage: f.businessImage ?? '',
          businessRating: typeof f.businessRating === 'number' ? f.businessRating : 0,
          businessVerified: f.businessVerified ?? false,
        }))
      );
    } catch {
      setIsAuthenticated(false);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (business: {
      id: string;
      name: string;
      category: string;
      image: string;
      rating: number;
      verified: boolean;
    }) => {
      if (!isAuthenticated) return;

      const existing = favorites.find((f) => f.businessId === business.id);

      if (existing) {
        // Remove from favorites
        await (amplifyDataClient.models as any).Favorite.delete(
          { id: existing.favoriteId },
          { authMode: 'userPool' }
        );
        setFavorites((prev) => prev.filter((f) => f.businessId !== business.id));
      } else {
        // Add to favorites
        const res = await (amplifyDataClient.models as any).Favorite.create(
          {
            businessId: business.id,
            businessName: business.name,
            businessCategory: business.category,
            businessImage: business.image,
            businessRating: business.rating,
            businessVerified: business.verified,
          },
          { authMode: 'userPool' }
        );
        if (res.data) {
          setFavorites((prev) => [
            ...prev,
            {
              favoriteId: res.data.id,
              businessId: business.id,
              businessName: business.name,
              businessCategory: business.category,
              businessImage: business.image,
              businessRating: business.rating,
              businessVerified: business.verified,
            },
          ]);
        }
      }
    },
    [isAuthenticated, favorites]
  );

  const favoriteIds = new Set(favorites.map((f) => f.businessId));

  return { favoriteIds, favorites, loading, toggleFavorite };
}
