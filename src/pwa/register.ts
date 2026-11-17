import { registerSW } from 'virtual:pwa-register';

/**
 * Routes where an automatic reload would interrupt play. Game screens live
 * under #/play (from M2). Game state is in IndexedDB, so a reload loses
 * nothing, but we still don't reload under someone's thumb (plan R-4).
 */
export function isSafeToReload(hash: string = location.hash): boolean {
  return !hash.startsWith('#/play');
}

/**
 * FR-1 AC-2: pick up a new version on the next launch while online.
 * The new service worker is applied as soon as it is safe to reload: right
 * away on a non-game screen, otherwise on the next navigation away from play.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let pending = false;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      applyIfSafe();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // iOS keeps standalone apps alive in the background, so check again on return.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update();
      });
    },
  });

  function applyIfSafe() {
    if (pending && isSafeToReload()) {
      pending = false;
      void updateSW(true);
    }
  }
  window.addEventListener('hashchange', applyIfSafe);
}
