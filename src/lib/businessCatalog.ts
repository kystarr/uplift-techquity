import { mockBusinesses } from "@/data/mockBusinesses";
import type { BusinessSummaryData } from "@/types/business";
import type { BusinessThreadSnapshot } from "@/types/messaging";

export function getBusinessById(id: string): BusinessSummaryData | undefined {
  return mockBusinesses.find((b) => b.id === id);
}

export function toThreadSnapshot(data: BusinessSummaryData): BusinessThreadSnapshot {
  return {
    name: data.name,
    image: data.image,
    rating: data.rating,
    reviewCount: data.reviewCount,
    distance: data.distance,
    verified: data.verified,
  };
}

export function snapshotForBusinessId(businessId: string): BusinessThreadSnapshot {
  const found = getBusinessById(businessId);
  if (found) return toThreadSnapshot(found);
  return {
    name: "Business",
    rating: 0,
    verified: false,
  };
}
