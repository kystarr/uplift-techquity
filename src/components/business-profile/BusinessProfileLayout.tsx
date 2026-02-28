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
import { ChevronLeft } from "lucide-react";
import { BusinessHeader } from "./BusinessHeader";
import { BusinessContactCard } from "./BusinessContactCard";
import { BusinessGallery } from "./BusinessGallery";
import { ReviewsPreview } from "./ReviewsPreview";
import type { Business } from "@/types/business";
import type { ReviewPreviewItem } from "./ReviewsPreview";
import { cn } from "@/lib/utils";

export interface BusinessProfileLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  business: Business;
  /** Optional review preview data (from same or separate API) */
  reviewsPreview?: ReviewPreviewItem[];
  reviewCount?: number;
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
              onViewAll={() => document.getElementById("reviews-section")?.scrollIntoView?.({ behavior: "smooth" })}
            />
          </section>
        </div>
        <div>
          <BusinessContactCard email={email} phone={phone} website={website} />
        </div>
      </div>
      <div id="reviews-section" aria-hidden="true" />
    </Container>
  );
};

export const BusinessProfileLayout = React.memo(BusinessProfileLayoutComponent);
