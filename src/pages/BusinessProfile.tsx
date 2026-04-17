import { useParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { amplifyDataClient } from "@/amplifyDataClient";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { useReviews } from "@/hooks/useReviews";
import { useMessages, MESSAGES_DRAFT_SEGMENT } from "@/hooks/useMessages";
import { useFavorites } from "@/hooks/useFavorites";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useFlag } from "@/hooks/useFlag";
import { useAdminModeration } from "@/hooks/useAdminModeration";
import { useAuth } from "@/contexts/AuthContext";
import { BusinessProfileLayout } from "@/components/business-profile/BusinessProfileLayout";
import { BusinessProfileSkeleton } from "@/components/business-profile/BusinessProfileSkeleton";
import { ErrorState } from "@/components/shared";
import { toast } from "sonner";

function formatUnknownError(input: unknown): string {
  if (input instanceof Error) {
    const ownProps = Object.getOwnPropertyNames(input)
      .filter((k) => !["name", "message", "stack"].includes(k))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (input as unknown as Record<string, unknown>)[key];
        return acc;
      }, {});
    const extras = Object.keys(ownProps).length > 0 ? ` ${JSON.stringify(ownProps)}` : "";
    return `${input.message || "Unknown error"}${extras}`;
  }
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

/**
 * Public business profile page. Fetches business by ID from /api/business/:id,
 * shows skeleton while loading (no layout shift), error UI on failure, and
 * layout with data on success.
 */
export default function BusinessProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { business, loading, error, refetch } = useBusinessProfile(id);
  const { reviews, submitting, submitReview } = useReviews(id);
  const { conversations } = useMessages();
  const { favoriteIds, loading: favoritesLoading, toggleFavorite } = useFavorites();
  const { backendRow: ownerBusinessRow } = useOwnerBusiness();
  const { submitFlag, submitting: flagSubmitting } = useFlag();
  const { adminRemoveBusiness, loading: moderationLoading } = useAdminModeration();

  const existingConversationId = useMemo(() => {
    if (!business) return null;
    return conversations.find((c) => c.businessId === business.id)?.id ?? null;
  }, [business, conversations]);
  const isOwnerViewingOwnBusiness = !!business && ownerBusinessRow?.id === business.id;

  useEffect(() => {
    if (!business?.id) return;

    const sessionKey = `uplift:viewed-business:${business.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const viewedAt = new Date().toISOString();
    const viewerId = user?.userId;

    const recordView = async () => {
      for (const authMode of ["userPool", "iam", "apiKey"] as const) {
        try {
          await (amplifyDataClient.models as any).BusinessProfileView.create(
            { businessId: business.id, viewerId, viewedAt },
            { authMode }
          );
          sessionStorage.setItem(sessionKey, viewedAt);
          return;
        } catch {
          // try next auth mode
        }
      }
    };

    void recordView();
  }, [business?.id, user?.userId]);

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

  const handleToggleFavorite = async () => {
    if (!business) return;
    if (!user) {
      toast.info("Please sign in to save favorites.");
      navigate("/auth");
      return;
    }

    const wasFavorite = favoriteIds.has(business.id);
    try {
      await toggleFavorite({
        id: business.id,
        name: business.name,
        category: business.categories[0] ?? "Business",
        image: business.images[0] ?? "",
        rating: business.averageRating,
        verified: business.isVerified,
      });
      toast.success(wasFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (err) {
      toast.error("Could not update favorites", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleFlagReview = async (reviewId: string) => {
    if (!isOwnerViewingOwnBusiness || !business || flagSubmitting) return;
    try {
      await submitFlag({
        targetType: "REVIEW",
        targetId: reviewId,
        reason: "OTHER",
        details: "Flagged by business owner from business profile reviews",
        targetName: business.name,
      });
      toast.success("Review flagged and hidden pending admin");
      await refetch();
    } catch {
      toast.error("Could not flag review");
    }
  };

  const handleAdminRemoveBusiness = async () => {
    if (!business || !isAdmin || moderationLoading) return;
    const confirmed = window.confirm(
      `Remove "${business.name}" from the platform? This deletes the business and associated reviews.`
    );
    if (!confirmed) return;

    try {
      await adminRemoveBusiness(business.id);
      toast.success("Business removed");
      navigate("/search");
    } catch (err) {
      // Temporary debugging aid while sandbox auth/error formatting is stabilized.
      console.error("adminRemoveBusiness failed", err);
      toast.error("Failed to remove business", {
        description: formatUnknownError(err),
      });
    }
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
        canModerateReviews={isOwnerViewingOwnBusiness}
        onFlagReview={handleFlagReview}
        onSubmitReview={submitReview}
        submittingReview={submitting}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={favoriteIds.has(business.id)}
        favoriteInProgress={favoritesLoading}
        onMessageBusiness={handleMessageBusiness}
        onRemoveBusiness={isAdmin ? handleAdminRemoveBusiness : undefined}
        removeBusinessInProgress={moderationLoading}
        backHref="/search"
      />
    </div>
  );
}
