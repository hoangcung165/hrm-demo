import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query matches, for the few cases where markup (not only style) depends on the viewport.
 * Without `matchMedia` (tests) it reports `fallback`.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback),
    () => fallback,
  );
}
