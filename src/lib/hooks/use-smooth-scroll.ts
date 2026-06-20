// src/lib/hooks/use-smooth-scroll.ts
"use client";

export function useSmoothScroll() {
  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    onNavigate?: () => void,
  ) => {
    // Execute any side-effects first (like closing a mobile menu)
    if (onNavigate) {
      onNavigate();
    }

    // Check if the link contains a hash anchor
    if (href.includes("#")) {
      const [path, hash] = href.split("#");

      // Only intercept the scroll if we are already on the target page
      if (!path || path === window.location.pathname) {
        e.preventDefault();
        const target = document.getElementById(hash);

        if (target) {
          target.scrollIntoView({ behavior: "smooth" });

          // Update the URL silently to reflect the current section
          const newUrl = path ? href : `${window.location.pathname}${href}`;
          window.history.pushState(null, "", newUrl);
        }
      }
    }
  };

  const scrollToTop = (
    e?: React.MouseEvent<HTMLAnchorElement>,
    pathname?: string,
  ) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Strip the hash from the URL seamlessly
    if (pathname) {
      window.history.pushState(null, "", pathname);
    }
  };

  return { handleSmoothScroll, scrollToTop };
}
