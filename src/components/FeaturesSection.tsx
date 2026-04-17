import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/** px movement per px of page scroll — alternating sign; kept moderate to stay inside the image slack */
const IMAGE_SCROLL_PARALLAX = [0.028, -0.024, 0.03, -0.022] as const;

const features = [
  {
    eyebrow: "Discover",
    title: "Smart Discovery",
    description:
      "Find businesses by location, category, voice search, or even upload photos to discover similar services.",
    imageSrc:
      "https://images.unsplash.com/photo-1482859602406-7659b00979fb?auto=format&fit=crop&w=1170&q=80",
    imageAlt: "Restaurant kitchen at night seen through the street window, staff preparing food",
  },
  {
    eyebrow: "Trust",
    title: "Verified & Trusted",
    description:
      "Every business goes through verification to ensure authenticity and protect our community.",
    imageSrc:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=960&q=80",
    imageAlt: "Handshake between two people in a professional setting",
  },
  {
    eyebrow: "Connect",
    title: "Direct Connection",
    description:
      "Message business owners directly, leave reviews, and share your favorite finds on social media.",
    imageSrc:
      "https://images.unsplash.com/photo-1739285988559-1f72f4792771?auto=format&fit=crop&w=1170&q=80",
    imageAlt: "Two people smiling together while looking at a laptop on a sofa",
  },
  {
    eyebrow: "Grow",
    title: "Growth Analytics",
    description:
      "Business owners get insights on customer trends, ratings, and visibility to help grow their enterprise.",
    imageSrc:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=960&q=80",
    imageAlt: "Laptop displaying charts and analytics on a desk",
  },
];

type FeaturesSectionProps = {
  /** Same scroll source as Hero — drives image parallax so it stays in sync with the rest of the page */
  scrollParallaxY?: number;
};

export const FeaturesSection = ({ scrollParallaxY = 0 }: FeaturesSectionProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="relative pt-24 pb-10 sm:pt-28 sm:pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" aria-hidden />
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accentHeading">
            Platform
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Built for Community Empowerment
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform bridges the gap between minority-owned businesses and customers who want to support them.
          </p>
        </div>

        <div className="mx-auto max-w-5xl divide-y divide-border/60">
          {features.map((feature, index) => {
            const reverse = index % 2 === 1;
            const y = scrollParallaxY * IMAGE_SCROLL_PARALLAX[index];
            return (
              <article
                key={feature.title}
                className="grid gap-8 py-12 md:grid-cols-2 md:items-center md:gap-14 md:py-14"
              >
                <div
                  className={cn(
                    "relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 dark:ring-white/10 md:mx-0 md:max-w-none",
                    reverse && "md:order-2 md:ml-auto",
                    !reverse && "md:mr-auto",
                  )}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {/* Taller than frame + vertical centering so parallax translate does not clip edges */}
                    <img
                      src={feature.imageSrc}
                      alt={feature.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        "w-full max-w-none object-cover object-center [transition:none]",
                        prefersReducedMotion
                          ? "relative h-full"
                          : "absolute left-0 top-1/2 will-change-transform",
                      )}
                      style={
                        prefersReducedMotion
                          ? undefined
                          : {
                              height: "132%",
                              transform: `translateY(calc(-50% + ${y}px))`,
                            }
                      }
                    />
                  </div>
                </div>
                <div className={cn("text-center md:text-left", reverse && "md:order-1")}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accentHeading">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mb-3 text-2xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
