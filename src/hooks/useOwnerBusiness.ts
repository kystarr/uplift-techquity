import { useState, useEffect, useCallback } from 'react';
import { Hub } from 'aws-amplify/utils';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCognitoSub } from '@/lib/cognito-identity';
import type { Business } from '@/types/business';
import type { Schema } from '../../amplify/data/resource';

type BackendBusiness = Schema['Business']['type'];

function mapBackendToUi(b: BackendBusiness): Business {
  return {
    id: b.id,
    name: b.businessName,
    description: b.description ?? '',
    email: b.contactEmail ?? undefined,
    phone: b.phone ?? undefined,
    website: b.website ?? undefined,
    images: b.images ?? [],
    isVerified: b.verified ?? false,
    verificationStatus: b.verificationStatus ?? 'PENDING',
    tags: b.tags ?? [],
    categories: b.categories ?? [],
    averageRating: typeof b.averageRating === 'number' ? b.averageRating : 0,
    reviewCount: typeof b.reviewCount === 'number' ? b.reviewCount : undefined,
    street: b.street ?? undefined,
    city: b.city ?? undefined,
    state: b.state ?? undefined,
    zip: b.zip ?? undefined,
  };
}

export interface UseOwnerBusinessResult {
  business: Business | null;
  backendRow: BackendBusiness | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * First business owned by the signed-in user (`ownerId` matches Cognito `sub`).
 */
export function useOwnerBusiness(): UseOwnerBusinessResult {
  const [business, setBusiness] = useState<Business | null>(null);
  const [backendRow, setBackendRow] = useState<BackendBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ownerId = await getCognitoSub();
      if (!ownerId) {
        setError(new Error('Not signed in'));
        setBusiness(null);
        setBackendRow(null);
        return;
      }
      const res = await amplifyDataClient.models.Business.list({
        filter: { ownerId: { eq: ownerId } },
        limit: 5,
        authMode: 'userPool',
      } as any);

      if (res.errors?.length) {
        throw new Error(res.errors.map((e: { message: string }) => e.message).join('; '));
      }

      let row = (res.data?.[0] as BackendBusiness | undefined) ?? null;

      // Fallback: filtered list occasionally empty in browser; scan a page and match ownerId
      if (!row) {
        const wide = await amplifyDataClient.models.Business.list({
          limit: 100,
          authMode: 'userPool',
        } as any);
        if (wide.errors?.length) {
          throw new Error(wide.errors.map((e: { message: string }) => e.message).join('; '));
        }
        row =
          (wide.data?.find((b: { ownerId?: string | null }) => b.ownerId === ownerId) as
            | BackendBusiness
            | undefined) ?? null;
      }

      setBackendRow(row);
      setBusiness(row ? mapBackendToUi(row) : null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load business'));
      setBusiness(null);
      setBackendRow(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'tokenRefresh') {
        fetchBusiness();
      }
    });
    return unsubscribe;
  }, [fetchBusiness]);

  return { business, backendRow, loading, error, refetch: fetchBusiness };
}
