import { useState } from 'react';
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
}: {
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
        <button
          type="button"
          aria-label={`Fewer ${name}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-text text-text disabled:opacity-30"
        >
          <MinusIcon width={18} height={18} />
        </button>
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
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="tabular h-11 w-11 rounded-xl bg-transparent text-center text-xl font-extrabold text-text outline-none focus:bg-surface"
        />
        <button
          type="button"
          aria-label={`More ${name}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-btn text-btn-text disabled:opacity-30"
        >
          <PlusIcon width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
