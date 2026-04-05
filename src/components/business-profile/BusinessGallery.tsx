import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export interface BusinessGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  images: string[];
  /** Alt text prefix for each image (e.g. business name) */
  altPrefix?: string;
}

/**
 * Image gallery: single image stays a simple layout; multiple images use a carousel.
 */
const BusinessGalleryComponent = ({
  images,
  altPrefix = "Business",
  className,
  ...props
}: BusinessGalleryProps) => {
  if (!images?.length) return null;

  if (images.length === 1) {
    const src = images[0];
    return (
      <div className={cn("rounded-lg overflow-hidden bg-muted", className)} {...props}>
        <img
          src={src}
          alt={`${altPrefix} photo`}
          className="w-full h-auto object-cover max-h-[480px]"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <Carousel className="w-full max-w-4xl mx-auto">
        <CarouselContent>
          {images.map((src, index) => (
            <CarouselItem key={`${src}-${index}`}>
              <figure className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                <img
                  src={src}
                  alt={`${altPrefix} photo ${index + 1} of ${images.length}`}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
};

export const BusinessGallery = React.memo(BusinessGalleryComponent);
