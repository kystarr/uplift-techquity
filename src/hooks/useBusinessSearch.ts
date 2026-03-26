import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';

/**
 * Minimal shape returned for each result on the search page.
 * Keeps the data shape flat and search-specific; full profile uses useBusinessProfile.
 */
export interface BusinessSearchResult {
    id: string;
    name: string;
    category: string;
    rating: number;
    tags: string[];
    verified: boolean;
    /** First image URL, if any */
    image?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
}

export interface UseBusinessSearchResult {
    businesses: BusinessSearchResult[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Fetches all APPROVED businesses for the search/discover page.
 *
 * Filtering strategy: Amplify Gen 2 does not yet support server-side
 * filter on arbitrary string fields without a GSI. We list all records
 * the current auth mode can see and filter client-side to
 * verificationStatus === "APPROVED". This is safe because:
 *   1. The S3/profile content for non-APPROVED businesses is never rendered.
 *   2. Guest users can only read — they cannot mutate anything.
 *
 * When volume grows, add a GSI on verificationStatus and switch to a
 * server-side filter here.
 */
export function useBusinessSearch(): UseBusinessSearchResult {
    const [businesses, setBusinesses] = useState<BusinessSearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchBusinesses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Auth mode priority:
            //   1. userPool  — works for signed-in users (Business has allow.authenticated())
            //   2. iam       — works for guests (Business has allow.guest() via IAM)
            //   3. apiKey    — final fallback
            let data: any[] | undefined;
            let errors: Array<{ message: string }> | undefined;

            const authModes = ['userPool', 'iam', 'apiKey'] as const;
            let lastError: unknown;

            for (const authMode of authModes) {
                try {
                    const res = await amplifyDataClient.models.Business.list({ authMode });
                    data = res.data;
                    errors = res.errors as Array<{ message: string }> | undefined;
                    break; // success — stop trying
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

            // Filter: only show APPROVED businesses publicly.
            const approved = (data ?? [])
                .filter((b) => b.verificationStatus === 'APPROVED')
                .map((b): BusinessSearchResult => ({
                    id: b.id,
                    name: b.businessName,
                    category:
                        (Array.isArray(b.categories) && b.categories[0]) ||
                        b.businessType ||
                        'Business',
                    rating: typeof b.averageRating === 'number' ? b.averageRating : 0,
                    tags: b.tags ?? [],
                    verified: b.verified ?? false,
                    image: Array.isArray(b.images) && b.images.length > 0
                        ? b.images[0]
                        : undefined,
                    city: b.city ?? undefined,
                    state: b.state ?? undefined,
                    latitude: typeof b.latitude === 'number' ? b.latitude : undefined,
                    longitude: typeof b.longitude === 'number' ? b.longitude : undefined,
                }));

            setBusinesses(approved);
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Failed to load businesses'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBusinesses();
    }, [fetchBusinesses]);

    const refetch = useCallback(() => {
        fetchBusinesses();
    }, [fetchBusinesses]);

    return { businesses, loading, error, refetch };
}
