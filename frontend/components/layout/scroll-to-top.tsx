'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Resets window scroll to the top whenever the route changes.
 * Next.js App Router doesn't guarantee this on its own, especially
 * when pages are cached or when an inner element (chat) previously
 * triggered scrollIntoView.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
