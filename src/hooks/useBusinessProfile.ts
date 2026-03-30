import { useState, useEffect, useCallback } from "react";
import { amplifyGet } from "@/lib/amplify-helpers";
import type { Business } from "@/types/business";

export interface UseBusinessProfileResult {
  business: Business | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches a single business by ID from the Amplify Data backend.
 * Only returns APPROVED businesses; unapproved records are treated as not found.
 */
export function useBusinessProfile(businessId: string | undefined): UseBusinessProfileResult {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mapBackendToUi = useCallback((b: any): Business => {
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
      street: b.street ?? undefined,
      city: b.city ?? undefined,
      state: b.state ?? undefined,
      zip: b.zip ?? undefined,
    };
  }, []);

  const fetchBusiness = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await amplifyGet('Business', id);

        if (!data) {
          throw new Error('Business not found');
        }

        if ((data as any).verificationStatus !== 'APPROVED') {
          throw new Error('Business not found');
        }

        setBusiness(mapBackendToUi(data));
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load business'));
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    },
    [mapBackendToUi]
  );

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setError(new Error("No business ID"));
      setBusiness(null);
      return;
    }
    fetchBusiness(businessId);
  }, [businessId, fetchBusiness]);

  const refetch = useCallback(() => {
    if (businessId) fetchBusiness(businessId);
  }, [businessId, fetchBusiness]);

  return { business, loading, error, refetch };
}
