import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * FR-19 AC-1: rows slide to their new place when the order changes (the FLIP
 * technique: measure before and after, then animate the difference). Each row
 * needs `data-flip-key`. Off with Reduce Motion.
 */
export function useFlip<T extends HTMLElement>(orderKey: string) {
  const ref = useRef<T>(null);
  const positions = useRef(new Map<string, number>());
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-flip-key]'));
    const next = new Map(rows.map((r) => [r.dataset.flipKey!, r.getBoundingClientRect().top]));
    if (!reduced) {
      for (const r of rows) {
        const before = positions.current.get(r.dataset.flipKey!);
        const after = next.get(r.dataset.flipKey!)!;
        if (before === undefined || before === after) continue;
        r.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'translateY(0)' }], { duration: 350, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
    positions.current = next;
  }, [orderKey, reduced]);
  return ref;
}
