import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { celebrationFor, type Celebration, type CelebrationKind } from '../domain/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

const SHOW_MS = 1600;
const Ctx = createContext<(kind: CelebrationKind, name: string) => void>(() => {});

/** Mini celebrations (FR-19 AC-2). With Reduce Motion they appear without any motion (AC-3). */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(Celebration & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const celebrate = useCallback((kind: CelebrationKind, name: string) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ ...celebrationFor(kind, name), id: Date.now() });
    // Light tap feedback where the browser supports it; iOS doesn't (spec C-3).
    navigator.vibrate?.(15);
    timer.current = setTimeout(() => setCurrent(null), SHOW_MS);
  }, []);
  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {current && (
        <div key={current.id} className="pointer-events-none fixed inset-x-0 top-[22%] z-[60] flex justify-center px-6" role="status" aria-live="polite">
          <div data-celebration={current.kind} className="celebrate-pop relative flex items-center gap-2.5 rounded-[24px] bg-btn px-5 py-3.5 text-btn-text shadow-lg">
            <span className="text-3xl" aria-hidden="true">
              {current.emoji}
            </span>
            <span className="text-[17px] font-extrabold">{current.text}</span>
            {!reduced &&
              Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="celebrate-burst absolute top-1/2 left-1/2 text-xl"
                  style={{ ['--a' as string]: `${i * 45}deg`, animationDelay: `${i * 15}ms` }}
                >
                  {current.emoji}
                </span>
              ))}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useCelebrate() {
  return useContext(Ctx);
}
