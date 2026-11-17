import { useEffect, useRef, type ButtonHTMLAttributes } from 'react';

/** Repeat timing (FR-18 AC-1): starts after ~400 ms, then speeds up while held. */
export const HOLD_DELAY_MS = 400;
const START_INTERVAL_MS = 160;
const MIN_INTERVAL_MS = 50;
const SPEED_UP = 0.85;

/**
 * A stepper button that repeats while held. A tap steps exactly once. Holding
 * repeats until the finger lifts, slides off, or `canStep` turns false (the
 * value hit its limit). iOS text selection and the long-press menu are off.
 */
export function HoldButton({
  onStep,
  canStep,
  className = '',
  style,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { onStep: () => void; canStep: boolean }) {
  // Latest callbacks for the timers, which outlive the render that started them.
  const step = useRef(onStep);
  const allowed = useRef(canStep);
  useEffect(() => {
    step.current = onStep;
    allowed.current = canStep;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const stop = () => {
    holding.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const repeat = (interval: number) => {
    timer.current = setTimeout(() => {
      if (!holding.current || !allowed.current) return stop();
      step.current();
      repeat(Math.max(MIN_INTERVAL_MS, interval * SPEED_UP));
    }, interval);
  };

  return (
    <button
      type="button"
      disabled={!canStep || rest.disabled}
      {...rest}
      className={`touch-manipulation select-none [-webkit-touch-callout:none] ${className}`}
      style={{ WebkitUserSelect: 'none', ...style }}
      onPointerDown={(e) => {
        if (e.button !== 0 || !allowed.current) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        holding.current = true;
        step.current();
        timer.current = setTimeout(() => repeat(START_INTERVAL_MS), HOLD_DELAY_MS - START_INTERVAL_MS);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        // Pointer presses are handled above; this keeps the keyboard (Enter/Space) working.
        if (e.detail === 0 && allowed.current) step.current();
      }}
    />
  );
}
