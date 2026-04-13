import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { useReviews } from "@/hooks/useReviews";
import { useMessages, MESSAGES_DRAFT_SEGMENT } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { BusinessProfileLayout } from "@/components/business-profile/BusinessProfileLayout";
import { BusinessProfileSkeleton } from "@/components/business-profile/BusinessProfileSkeleton";
import { ErrorState } from "@/components/shared";
import { toast } from "sonner";

/**
 * Public business profile page. Fetches business by ID from /api/business/:id,
 * shows skeleton while loading (no layout shift), error UI on failure, and
 * layout with data on success.
 */
export default function BusinessProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { business, loading, error, refetch } = useBusinessProfile(id);
  const { reviews, submitting, submitReview } = useReviews(id);
  const { conversations } = useMessages();

  const existingConversationId = useMemo(() => {
    if (!business) return null;
    return conversations.find((c) => c.businessId === business.id)?.id ?? null;
  }, [business, conversations]);

  const handleMessageBusiness = () => {
    if (!business) return;

    if (!user) {
      toast.info("Please sign in to message this business.");
      navigate("/auth");
      return;
    }

    const state = {
      businessName: business.name,
      businessImage: business.images[0],
      businessId: business.id,
    };

    if (existingConversationId) {
      navigate(`/messages/${existingConversationId}`, { state });
      return;
    }

    // No DB row until the user sends their first message.
    navigate(`/messages/${MESSAGES_DRAFT_SEGMENT}`, { state });
  };

  if (loading) {
    return (
      <div className="bg-background">
        <BusinessProfileSkeleton />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="bg-background">
        <ErrorState
          title={
            error?.message === "Business not found"
              ? "Business not found"
              : "Something went wrong"
          }
          message={
            error?.message === "Business not found"
              ? "This business may have been removed or the link might be incorrect."
              : "We couldn't load this business. Please try again."
          }
          onRetry={refetch}
          retryLabel="Try again"
        />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <BusinessProfileLayout
        business={business}
        reviewCount={reviews.length}
        reviewsPreview={reviews.slice(0, 3)}
        onSubmitReview={submitReview}
        submittingReview={submitting}
        onMessageBusiness={handleMessageBusiness}
        backHref="/search"
      />
    </div>
  );
}
