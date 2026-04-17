import * as React from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared";
import { ChevronLeft, Heart, MessageCircle, Trash2 } from "lucide-react";
import { BusinessHeader } from "./BusinessHeader";
import { BusinessContactCard } from "./BusinessContactCard";
import { BusinessGallery } from "./BusinessGallery";
import { ReviewsPreview } from "./ReviewsPreview";
import { ReviewForm } from "./ReviewForm";
import { ShareBusinessMenu } from "./ShareBusinessMenu";
import type { Business } from "@/types/business";
import type { ReviewPreviewItem } from "./ReviewsPreview";
import { cn } from "@/lib/utils";

export interface BusinessProfileLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  business: Business;
  /** Optional review preview data (from same or separate API) */
  reviewsPreview?: ReviewPreviewItem[];
  reviewCount?: number;
  canModerateReviews?: boolean;
  onFlagReview?: (reviewId: string) => void | Promise<void>;
  /** Called when a user submits a review */
  onSubmitReview?: (params: { businessId: string; rating: number; text: string; authorName: string }) => Promise<void>;
  submittingReview?: boolean;
  /** Optional action to start/open a message conversation for this business. */
  onMessageBusiness?: () => void;
  messagingInProgress?: boolean;
  /** Optional action to favorite/unfavorite this business from profile page. */
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  favoriteInProgress?: boolean;
  /** Admin-only destructive action for removing this business. */
  onRemoveBusiness?: () => void;
  removeBusinessInProgress?: boolean;
  /** Back link href (e.g. /search). If not set, breadcrumb still shows Search > Business name */
  backHref?: string;
}

/**
 * Public business profile layout: header, gallery, description, contact, reviews preview.
 * Composed from presentational subcomponents; no data fetching. State boundaries are
 * at the page level (data passed in as props).
 */
const BusinessProfileLayoutComponent = ({
  business,
  reviewsPreview = [],
  reviewCount = 0,
  canModerateReviews = false,
  onFlagReview,
  onSubmitReview,
  submittingReview = false,
  onMessageBusiness,
  messagingInProgress = false,
  onToggleFavorite,
  isFavorite = false,
  favoriteInProgress = false,
  onRemoveBusiness,
  removeBusinessInProgress = false,
  backHref = "/search",
  className,
  ...props
}: BusinessProfileLayoutProps) => {
  const {
    name,
    description,
    email,
    phone,
    website,
    images,
    isVerified,
    tags,
    categories,
    averageRating,
    street,
    city,
    state,
    zip,
  } = business;

  return (
    <Container maxWidth="4xl" padding="default" className={cn(className)} {...props}>
      {/* Navigation: breadcrumb or back button */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={backHref}>Search</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 -ml-2"
          asChild
          aria-label="Go back to search"
        >
          <Link to={backHref}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </nav>

      {/* Header: name, verification, rating, categories, tags */}
      <BusinessHeader
        name={name}
        isVerified={isVerified}
        averageRating={averageRating}
        reviewCount={reviewCount}
        categories={categories}
        tags={tags}
      />

      {/* Gallery */}
      <section aria-label="Business photos" className="mt-8">
        <BusinessGallery images={images} altPrefix={name} />
      </section>

      {/* Description */}
      {description && (
        <section className="mt-8" aria-labelledby="description-heading">
          <h2 id="description-heading" className="text-lg font-semibold text-default-heading mb-2">
            About
          </h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
        </section>
      )}

      {/* Contact + Reviews side-by-side on larger screens */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section aria-label="Reviews preview">
            <ReviewsPreview
              reviews={reviewsPreview}
              averageRating={averageRating}
              totalCount={reviewCount}
              canModerateReviews={canModerateReviews}
              onFlagReview={onFlagReview}
              onViewAll={() => document.getElementById("reviews-section")?.scrollIntoView?.({ behavior: "smooth" })}
            />
          </section>
          {onSubmitReview && (
            <section aria-label="Write a review">
              <ReviewForm
                businessId={business.id}
                submitting={submittingReview}
                onSubmit={onSubmitReview}
              />
            </section>
          )}
        </div>
        <div>
          {onToggleFavorite && (
            <Button
              type="button"
              variant={isFavorite ? "default" : "outline"}
              className="mb-4 w-full"
              onClick={onToggleFavorite}
              disabled={favoriteInProgress}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Saved to favorites" : "Save to favorites"}
            </Button>
          )}
          {onMessageBusiness && (
            <Button
              type="button"
              className="mb-4 w-full"
              onClick={onMessageBusiness}
              disabled={messagingInProgress}
            >
              <MessageCircle className="h-4 w-4" />
              Message business
            </Button>
          )}
          {onRemoveBusiness && (
            <Button
              type="button"
              variant="destructive"
              className="mb-4 w-full"
              onClick={onRemoveBusiness}
              disabled={removeBusinessInProgress}
            >
              <Trash2 className="h-4 w-4" />
              Remove business
            </Button>
          )}
          <BusinessContactCard email={email} phone={phone} website={website} street={street} city={city} state={state} zip={zip} />
        </div>
      </div>
      <div id="reviews-section" aria-hidden="true" />
    </Container>
  );
};

export const BusinessProfileLayout = React.memo(BusinessProfileLayoutComponent);
