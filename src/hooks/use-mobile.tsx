import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const mobileMediaQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Subscribes to a single mobile breakpoint. Uses `matchMedia(...).matches` for
 * both the initial read and change events so behavior stays aligned with the
 * same CSS media query (viewport semantics, zoom, etc.).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(mobileMediaQuery);

    const sync = () => {
      setIsMobile(mql.matches);
    };

    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return Boolean(isMobile);
}
