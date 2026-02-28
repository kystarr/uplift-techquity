import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/api";
import type { Business } from "@/types/business";

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

  const fetchBusiness = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = getApiUrl(`/api/business/${id}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Business not found" : `Failed to load business (${res.status})`);
      }
      const data = (await res.json()) as Business;
      setBusiness(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load business"));
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
