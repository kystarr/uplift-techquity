import { useState, useEffect, useCallback } from "react";
import { amplifyDataClient } from "@/amplifyDataClient";
import type { Business } from "@/types/business";
import type { Schema } from "../../amplify/data/resource";

type BackendBusiness = Schema["Business"]["type"];

export interface UseBusinessProfileResult {
  business: Business | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches business by ID from /api/business/:id.
 * Keeps loading/error in hook so the page can show skeleton or error UI
 * without layout shift (skeleton preserves space; error replaces content).
 */
export function useBusinessProfile(businessId: string | undefined): UseBusinessProfileResult {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mapBackendToUi = useCallback((b: BackendBusiness): Business => {
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
    };
  }, []);

  const fetchBusiness = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        // Auth mode priority: userPool (signed-in) → iam (guest) → apiKey (fallback)
        let data: BackendBusiness | null | undefined;
        let errors: Array<{ message: string }> | undefined;
        let lastError: unknown;

        for (const authMode of ['userPool', 'iam', 'apiKey'] as const) {
          try {
            const res = await amplifyDataClient.models.Business.get({ id }, { authMode } as any);
            data = res.data;
            errors = res.errors as Array<{ message: string }> | undefined;
            break;
          } catch (e) {
            lastError = e;
          }
        }

        if (data === undefined) {
          throw lastError ?? new Error('All auth modes failed');
        }

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e) => e.message).join(', '));
        }

        if (!data) {
          throw new Error('Business not found');
        }

        // Guard: only render APPROVED businesses publicly.
        // This prevents unapproved/pending businesses from being accessible
        // via direct URL even if auth rules allow the read.
        if (data.verificationStatus !== 'APPROVED') {
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
