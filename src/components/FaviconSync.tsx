import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const FAVICON_HREF = "/Uplift_Logo_No_Words.png";

/**
 * Keeps the favicon set to the Uplift logo on every client-side navigation.
 * Some browsers revert to a cached or default icon when the route changes;
 * this re-applies our icon so it stays consistent.
 */
export function FaviconSync() {
  const location = useLocation();

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = FAVICON_HREF;
  }, [location.pathname]);

  return null;
}
