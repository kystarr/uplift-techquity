import { useParams } from "react-router-dom";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { BusinessProfileLayout } from "@/components/business-profile/BusinessProfileLayout";
import { BusinessProfileSkeleton } from "@/components/business-profile/BusinessProfileSkeleton";
import { ErrorState } from "@/components/shared";

/**
 * Public business profile page. Fetches business by ID from /api/business/:id,
 * shows skeleton while loading (no layout shift), error UI on failure, and
 * layout with data on success.
 */
export default function BusinessProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { business, loading, error, refetch } = useBusinessProfile(id);

  if (loading) {
    return <BusinessProfileSkeleton />;
  }

  if (error || !business) {
    return (
      <ErrorState
        title={error?.message === "Business not found" ? "Business not found" : "Something went wrong"}
        message={
          error?.message === "Business not found"
            ? "This business may have been removed or the link might be incorrect."
            : "We couldn't load this business. Please try again."
        }
        onRetry={refetch}
        retryLabel="Try again"
      />
    );
  }

  return (
    <BusinessProfileLayout
      business={business}
      reviewCount={0}
      reviewsPreview={[]}
      backHref="/search"
    />
  );
}
