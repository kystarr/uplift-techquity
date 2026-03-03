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
      description: b.description ?? "",
      email: b.contactEmail ?? undefined,
      phone: b.phone ?? undefined,
      website: b.website ?? undefined,
      images: b.images ?? [],
      isVerified: b.verified ?? false,
      tags: b.tags ?? [],
      categories: b.categories ?? [],
      averageRating: typeof b.averageRating === "number" ? b.averageRating : 0,
    };
  }, []);

  const fetchBusiness = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, errors } = await amplifyDataClient.models.Business.get({ id });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e) => e.message).join(", "));
        }

        if (!data) {
          throw new Error("Business not found");
        }

        setBusiness(mapBackendToUi(data));
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to load business"));
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
