import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener?.('change', cb);
  return () => mq?.removeEventListener?.('change', cb);
}

/** FR-19 AC-3: true when iOS Reduce Motion is on. JavaScript motion checks this; CSS motion is off via index.css. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => !!window.matchMedia?.(QUERY).matches, () => false);
}
