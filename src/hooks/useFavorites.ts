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
  businessLatitude?: number;
  businessLongitude?: number;
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
    latitude?: number;
    longitude?: number;
  }) => Promise<void>;
}

function isOwnedByCurrentUser(
  ownerValue: unknown,
  currentUser: { userId?: string; username?: string }
): boolean {
  if (typeof ownerValue !== 'string' || ownerValue.trim().length === 0) return false;

  const owner = ownerValue.trim();
  const ownerParts = owner.split('::');
  const ownerSub = ownerParts[0];
  const ownerUsername = ownerParts.length > 1 ? ownerParts[ownerParts.length - 1] : owner;

  return (
    (!!currentUser.userId && (owner === currentUser.userId || ownerSub === currentUser.userId)) ||
    (!!currentUser.username &&
      (owner === currentUser.username || ownerUsername === currentUser.username))
  );
}

function filterFavoritesToCurrentUser(
  rows: any[],
  currentUser: { userId?: string; username?: string }
): any[] {
  const hasOwnerField = rows.some((row) => typeof row?.owner === 'string' && row.owner.trim().length > 0);
  if (!hasOwnerField) return rows;
  return rows.filter((row) => isOwnedByCurrentUser(row?.owner, currentUser));
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
      const currentUser = await getCurrentUser(); // throws if not signed in
      setIsAuthenticated(true);
      const res = await (amplifyDataClient.models as any).Favorite.list({
        authMode: 'userPool',
      });
      const data = filterFavoritesToCurrentUser(res.data ?? [], {
        userId: currentUser.userId,
        username: currentUser.username,
      });
      const snapshots = data.map((f: any): FavoriteBusinessSnapshot => ({
        favoriteId: f.id,
        businessId: f.businessId,
        businessName: f.businessName ?? '',
        businessCategory: f.businessCategory ?? '',
        businessImage: f.businessImage ?? '',
        businessRating: typeof f.businessRating === 'number' ? f.businessRating : 0,
        businessVerified: f.businessVerified ?? false,
        businessLatitude: typeof f.businessLatitude === 'number' ? f.businessLatitude : undefined,
        businessLongitude: typeof f.businessLongitude === 'number' ? f.businessLongitude : undefined,
      }));

      const dedupedByBusinessId = new Map<string, FavoriteBusinessSnapshot>();
      const duplicateFavoriteIds: string[] = [];

      snapshots.forEach((snapshot) => {
        if (dedupedByBusinessId.has(snapshot.businessId)) {
          duplicateFavoriteIds.push(snapshot.favoriteId);
          return;
        }
        dedupedByBusinessId.set(snapshot.businessId, snapshot);
      });

      setFavorites(Array.from(dedupedByBusinessId.values()));

      if (duplicateFavoriteIds.length > 0) {
        await Promise.all(
          duplicateFavoriteIds.map((favoriteId) =>
            (amplifyDataClient.models as any).Favorite.delete(
              { id: favoriteId },
              { authMode: 'userPool' }
            ).catch(() => null)
          )
        );
      }
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

  const toggleFavorite = useCallback<UseFavoritesResult['toggleFavorite']>(
    async (business) => {
      if (!isAuthenticated) return;

      const existingEntries = favorites.filter((f) => f.businessId === business.id);

      if (existingEntries.length > 0) {
        // Optimistically update UI first so the card disappears immediately.
        setFavorites((prev) => prev.filter((f) => f.businessId !== business.id));
        try {
          // IMPORTANT: delete *all* Favorite rows for this businessId (including any
          // duplicates not currently present in local state).
          const currentUser = await getCurrentUser();
          const res = await (amplifyDataClient.models as any).Favorite.list({
            authMode: 'userPool',
          });
          const data = filterFavoritesToCurrentUser(res.data ?? [], {
            userId: currentUser.userId,
            username: currentUser.username,
          });
          const idsToDelete = data
            .filter((f: any) => f.businessId === business.id)
            .map((f: any) => f.id as string);
          const fallbackIds = existingEntries.map((f) => f.favoriteId);
          const uniqueIdsToDelete = Array.from(new Set([...idsToDelete, ...fallbackIds]));

          await Promise.allSettled(
            uniqueIdsToDelete.map((favoriteId) =>
              (amplifyDataClient.models as any).Favorite.delete(
                { id: favoriteId },
                { authMode: 'userPool' }
              )
            )
          );
        } finally {
          // Re-sync with backend after delete attempts in case of partial failures.
          await fetchFavorites();
        }
      } else {
        // Add to favorites, but guard against duplicate rows in backend.
        const currentUser = await getCurrentUser();
        const existingRes = await (amplifyDataClient.models as any).Favorite.list({
          authMode: 'userPool',
        });
        const existingData = filterFavoritesToCurrentUser(existingRes.data ?? [], {
          userId: currentUser.userId,
          username: currentUser.username,
        });
        const alreadyExists = existingData.some((f: any) => f.businessId === business.id);

        if (!alreadyExists) {
          const res = await (amplifyDataClient.models as any).Favorite.create(
            {
              businessId: business.id,
              businessName: business.name,
              businessCategory: business.category,
              businessImage: business.image,
              businessRating: business.rating,
              businessVerified: business.verified,
              businessLatitude: business.latitude,
              businessLongitude: business.longitude,
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
                businessLatitude: business.latitude,
                businessLongitude: business.longitude,
              },
            ]);
          }
        }
      }
    },
    [isAuthenticated, favorites, fetchFavorites]
  );

  const favoriteIds = new Set(favorites.map((f) => f.businessId));

  return { favoriteIds, favorites, loading, toggleFavorite } satisfies UseFavoritesResult;
}
