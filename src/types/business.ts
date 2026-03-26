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
  /** Mirrors verificationStatus on the backend: PENDING | APPROVED | UNDER_REVIEW | REJECTED */
  verificationStatus?: string;
  tags: string[];
  categories: string[];
  averageRating: number;
  reviewCount?: number;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/** @deprecated Use Business.reviewCount directly */
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
