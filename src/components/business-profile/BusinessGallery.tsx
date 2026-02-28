import * as React from "react";
import { cn } from "@/lib/utils";

export interface BusinessGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  images: string[];
  /** Alt text prefix for each image (e.g. business name) */
  altPrefix?: string;
}

/**
 * Image gallery for business profile. Prevents layout shift by using
 * aspect-ratio. Accessible with descriptive alt text.
 */
const BusinessGalleryComponent = ({
  images,
  altPrefix = "Business",
  className,
  ...props
}: BusinessGalleryProps) => {
  if (!images?.length) return null;

  return (
    <div
      className={cn("space-y-4", className)}
      role="list"
      aria-label="Business photo gallery"
      {...props}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((src, index) => (
          <figure
            key={`${src}-${index}`}
            className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted"
            role="listitem"
          >
            <img
              src={src}
              alt={`${altPrefix} photo ${index + 1} of ${images.length}`}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
          </figure>
        ))}
      </div>
    </div>
  );
};

export const BusinessGallery = React.memo(BusinessGalleryComponent);
