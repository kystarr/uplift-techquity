/**
 * Shape of data for displaying a business in summary cards and lists.
 * Use this type when fetching or passing business data to card components.
 */
export interface BusinessSummaryData {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount?: number;
  distance?: string;
  image?: string;
  tags: string[];
  verified: boolean;
}
