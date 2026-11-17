import { useState } from 'react';
import { HoldButton } from './HoldButton';
import { MinusIcon, PlusIcon } from './Icons';
import { NoWrap } from './NoWrap';

/**
 * +/− stepper for small counts (FR-18 AC-1). Tapping the number opens the
 * iOS number pad (AC-3), so a count of 12 is one entry, not 12 taps (NFR-2).
 */
export function CountStepper({
  label,
  name,
  value,
  min = 0,
  max,
  onChange,
  disabled = false,
  typeable = true,
}: {
  /** False shows the number without the number pad (counts that must move one at a time). */
  typeable?: boolean;
  /** Shown above, e.g. "Dutch +1". */
  label: string;
  /** For screen readers, e.g. "Dutch cards for Alex". */
  name: string;
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="flex flex-col items-center gap-0.5">
      <NoWrap className="text-[13px] text-text-2">{label}</NoWrap>
      <div className="flex items-center gap-1">
        <HoldButton
          aria-label={`Fewer ${name}`}
          // With a keyboard, Tab goes field to field and + or − step (FR-20 AC-4).
          tabIndex={typeable ? -1 : undefined}
          canStep={!disabled && value > min}
          onStep={() => onChange(clamp(value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-text text-text disabled:opacity-30"
        >
          <MinusIcon width={18} height={18} />
        </HoldButton>
        {typeable ? (
          <input
            aria-label={name}
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            disabled={disabled}
            value={text ?? String(value)}
            onFocus={(e) => {
              setText(String(value));
              e.target.select();
            }}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
              setText(digits);
              if (digits !== '') onChange(clamp(Number(digits)));
            }}
            onBlur={() => setText(null)}
            data-count-field=""
            onKeyDown={(e) => {
              if (e.metaKey || e.ctrlKey || e.altKey) return;
              // FR-20 AC-4: + and − step by one (the key's own repeat keeps stepping while held),
              // the arrow keys move between fields, Enter leaves the field.
              const step = e.key === '+' || e.key === '=' ? 1 : e.key === '-' || e.key === '−' ? -1 : 0;
              if (step) {
                e.preventDefault();
                const n = clamp(value + step);
                setText(String(n));
                onChange(n);
                requestAnimationFrame(() => e.currentTarget?.select?.());
                return;
              }
              const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
              if (move) {
                e.preventDefault();
                moveField(e.currentTarget, move);
                return;
              }
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="tabular h-11 w-11 rounded-xl bg-transparent text-center text-xl font-extrabold text-text outline-none focus:bg-surface"
          />
        ) : (
          <span aria-label={name} className="tabular w-9 text-center text-xl font-extrabold">
            {value}
          </span>
        )}
        <HoldButton
          aria-label={`More ${name}`}
          tabIndex={typeable ? -1 : undefined}
          canStep={!disabled && value < max}
          onStep={() => onChange(clamp(value + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-btn text-btn-text disabled:opacity-30"
        >
          <PlusIcon width={18} height={18} />
        </HoldButton>
      </div>
    </div>
  );
}

/** Focuses the next or previous stepper field on the screen (FR-20 AC-4). */
export function moveField(from: Element | null, by: number) {
  const all = [...document.querySelectorAll<HTMLInputElement>('input[data-count-field]:not(:disabled)')];
  if (!all.length) return;
  const i = from ? all.indexOf(from as HTMLInputElement) : -1;
  const to = i < 0 ? (by > 0 ? all[0] : all[all.length - 1]) : all[Math.max(0, Math.min(all.length - 1, i + by))];
  to?.focus();
}
