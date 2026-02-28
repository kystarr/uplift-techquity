/**
 * Core business entity used across public profile, edit form, and search.
 * Aligns with API GET/PUT /api/business/:id.
 */
export interface Business {
  id: string;
  name: string;
  description: string;
  email?: string;
  phone?: string;
  website?: string;
  images: string[];
  isVerified: boolean;
  tags: string[];
  categories: string[];
  averageRating: number;
}

/** Optional review count for display (e.g. "4.9 (234 reviews)") */
export interface BusinessWithReviewCount extends Business {
  reviewCount?: number;
}

/** Payload for PUT /api/business/:id (editable fields only) */
export interface BusinessUpdatePayload {
  name: string;
  description: string;
  email?: string;
  phone?: string;
  website?: string;
  tags: string[];
  categories: string[];
}
