import { useSyncExternalStore } from 'react';

/**
 * NFR-3: the iPad in landscape (1180×820 and up). Two-pane layouts render a
 * different tree here, so portrait and iPhone layouts stay exactly as they were.
 */
export const LANDSCAPE_QUERY = '(min-width: 1024px) and (orientation: landscape)';

function subscribe(cb: () => void) {
  const m = window.matchMedia(LANDSCAPE_QUERY);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}

export function useLandscape(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(LANDSCAPE_QUERY).matches, () => false);
}
