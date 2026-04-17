import { useEffect, useState } from "react";

/**
 * Window scroll Y for layered parallax (hero backgrounds, CTA, etc.).
 * Returns 0 when prefers-reduced-motion is set.
 */
export function useScrollParallax() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrollY;
}
