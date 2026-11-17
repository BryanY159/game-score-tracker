import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const DURATION_MS = 450;

/** FR-19 AC-1: a score counts up (or down) to its new value. Instant with Reduce Motion. */
export function CountUp({ value, className, ...rest }: { value: number; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION_MS);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, reduced]);
  return (
    <span className={className} {...rest} data-value={value}>
      {shown}
    </span>
  );
}
