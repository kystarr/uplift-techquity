import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/** Illustrative placeholder names only — not real directory listings. */
const SAMPLE_SMALL_BUSINESSES = [
  "Harbor Street Coffee",
  "Bloom Flower Studio",
  "Little Light Bookshop",
  "Crown Cuts Barbershop",
  "Oak & Anchor Woodworks",
  "El Mercadito Kitchen",
  "Third Coast Bikes",
  "Grandma Rose’s Pies",
  "Blue Note Vinyl",
  "Spiced Path Apothecary",
  "Founders Table Diner",
  "Jade Lantern Noodles",
] as const;

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type HeroProps = {
  /** Page scroll (px) for background parallax — from parent so one scroll listener drives the landing page */
  scrollParallaxY?: number;
};

export const Hero = ({ scrollParallaxY = 0 }: HeroProps) => {
  const navigate = useNavigate();
  const sy = scrollParallaxY;
  const trustedPartners = useMemo(() => shuffled(SAMPLE_SMALL_BUSINESSES), []);

  return (
    <section className="relative min-h-[720px] flex flex-col justify-center overflow-hidden bg-gradient-hero pb-16 pt-8 sm:pb-20">
      {/* Animated mesh — parallax on wrappers so float/shimmer keyframes still run on children */}
      <div className="pointer-events-none absolute inset-0 opacity-90 motion-reduce:opacity-60" aria-hidden>
        <div
          className="absolute -left-[20%] top-[10%] h-[min(520px,55vw)] w-[min(520px,55vw)] will-change-transform"
          style={{ transform: `translate3d(0, ${sy * 0.08}px, 0)` }}
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.35)_0%,transparent_68%)] blur-3xl motion-reduce:animate-none animate-hero-float-a" />
        </div>
        <div
          className="absolute -right-[15%] top-[5%] h-[min(440px,48vw)] w-[min(440px,48vw)] will-change-transform"
          style={{ transform: `translate3d(0, ${sy * -0.06}px, 0)` }}
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.22)_0%,transparent_70%)] blur-3xl motion-reduce:animate-none animate-hero-float-b" />
        </div>
        <div
          className="absolute bottom-[5%] left-[30%] h-[min(380px,42vw)] w-[min(380px,42vw)] will-change-transform"
          style={{ transform: `translate3d(0, ${sy * 0.07}px, 0)` }}
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,hsl(var(--accent-heading)/0.12)_0%,transparent_72%)] blur-3xl motion-reduce:animate-none animate-hero-float-a" />
        </div>
      </div>
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${sy * 0.03}px, 0)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.2),transparent_45%)]" />
      </div>
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${sy * 0.04}px, 0)` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(105deg,hsl(var(--primary)/0.08)_0%,transparent_38%,hsl(var(--primary)/0.06)_72%,transparent_100%)] bg-[length:200%_200%] motion-reduce:animate-none animate-hero-shimmer" />
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0">
            <p className="mb-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-accentHeading sm:text-xs">
              Discovery · Trust · Impact
            </p>
            <h1 className="text-4xl font-bold leading-[1.12] text-foreground sm:text-5xl sm:leading-[1.15] lg:text-6xl lg:leading-[1.18]">
              Empowering Communities Through
              <span className="mt-2 block bg-gradient-to-r from-foreground via-accentHeading to-foreground bg-clip-text pb-1 leading-snug text-transparent dark:from-foreground dark:via-primary dark:to-foreground">
                Supporting Small Businesses
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Discover, support, and connect with trusted minority-owned businesses in your community. Building economic equity, one connection at a time.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate("/search")}
                className="min-h-12 w-full min-w-48 shadow-lg transition-smooth hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
              >
                Find Businesses
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/register/1")}
                className="min-h-12 w-full min-w-48 border-white/50 bg-white/40 backdrop-blur-sm transition-smooth hover:-translate-y-0.5 hover:bg-white/60 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20 sm:w-auto"
              >
                Register Your Business
              </Button>
            </div>
          </div>

          {/* Trusted-by strip — Figma-style social proof */}
          <div
            className="relative mt-16 overflow-hidden rounded-2xl border border-white/20 bg-white/30 py-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 will-change-transform"
            style={{ transform: `translate3d(0, ${sy * -0.02}px, 0)` }}
          >
            <p className="mb-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Trusted by
            </p>
            <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent_0%,black_12%,black_88%,transparent_100%)]">
              <div className="flex w-max gap-12 px-6 motion-reduce:animate-none animate-trusted-marquee items-center">
                {[...trustedPartners, ...trustedPartners].map((label, i) => (
                  <span
                    key={`${label}-${i}`}
                    className="whitespace-nowrap text-sm font-medium text-foreground/75"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
