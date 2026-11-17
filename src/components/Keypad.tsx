import { useRef } from 'react';
import { NoWrap } from './NoWrap';

export interface GameKey {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** A toggle key that is on (e.g. Flip 7!). */
  pressed?: boolean;
}

/**
 * Custom number pad for open-ended numbers (FR-18 AC-2), with game keys
 * (Next player, Bust, Flip 7!). Tapping the number itself opens the iOS
 * number pad instead (AC-3). Values are whole numbers of up to `maxDigits`.
 */
export function Keypad({
  label,
  value,
  onChange,
  next,
  sideKeys = [],
  maxDigits = 7,
  bare = false,
  headerExtra,
}: {
  /** Extra control on the label row, e.g. the Flip 7 Number/Cards switch. */
  headerExtra?: React.ReactNode;
  /** Inside a panel that already has a border and padding. */
  bare?: boolean;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  next?: GameKey;
  sideKeys?: GameKey[];
  maxDigits?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const text = value === null ? '' : String(value);
  const press = (d: string) => {
    const t = (text === '0' ? '' : text) + d;
    if (t.length <= maxDigits) onChange(Number(t));
  };
  const back = () => onChange(text.length > 1 ? Number(text.slice(0, -1)) : null);
  const cols = sideKeys.length ? 4 : 3;

  const digit = (d: string) => (
    <button key={d} type="button" onClick={() => press(d)} className={KEY}>
      {d}
    </button>
  );

  return (
    <div className={bare ? '' : 'border-t border-border bg-bg px-3 pt-2 pb-2'} role="group" aria-label="Number pad">
      <div className="mx-auto flex max-w-lg flex-col gap-1.5">
      <div className="flex items-center gap-3 px-1">
        <NoWrap truncate className="flex-1 text-[15px] font-bold">
          {label}
        </NoWrap>
        <input
          ref={input}
          aria-label={`${label} value`}
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="next"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, maxDigits);
            onChange(digits === '' ? null : Number(digits));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              input.current?.blur();
              next?.onPress();
            }
          }}
          className={`tabular h-11 rounded-[14px] border-[1.5px] border-border bg-surface px-3 text-right text-[24px] font-extrabold text-text outline-none focus:border-text ${
            headerExtra ? 'w-20' : 'w-36'
          }`}
        />
        {headerExtra}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {['1', '2', '3'].map(digit)}
        {sideKeys[0] && <Side k={sideKeys[0]} />}
        {['4', '5', '6'].map(digit)}
        {sideKeys[1] && <Side k={sideKeys[1]} />}
        {['7', '8', '9'].map(digit)}
        {sideKeys.length > 0 && (sideKeys[2] ? <Side k={sideKeys[2]} /> : <span />)}
        <button type="button" aria-label="Delete" onClick={back} className={KEY}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 5H9l-6 7 6 7h12z" />
            <path d="M17 9l-6 6M11 9l6 6" />
          </svg>
        </button>
        {digit('0')}
        {next ? (
          <button
            type="button"
            onClick={next.onPress}
            disabled={next.disabled}
            className="flex h-11 items-center justify-center rounded-[14px] bg-btn px-2 text-[16px] font-extrabold text-btn-text disabled:opacity-40"
            style={{ gridColumn: `span ${cols - 2}` }}
          >
            <NoWrap>{next.label}</NoWrap>
          </button>
        ) : (
          <span style={{ gridColumn: `span ${cols - 2}` }} />
        )}
      </div>
      </div>
    </div>
  );
}

const KEY = 'tabular flex h-11 items-center justify-center rounded-[14px] bg-surface text-[22px] font-bold text-text';

function Side({ k }: { k: GameKey }) {
  return (
    <button
      type="button"
      onClick={k.onPress}
      disabled={k.disabled}
      aria-pressed={k.pressed}
      className={`flex h-11 items-center justify-center rounded-[14px] border-[1.5px] border-text px-1 text-[15px] font-extrabold disabled:opacity-40 ${
        k.pressed ? 'bg-text text-bg' : 'text-text'
      }`}
    >
      <NoWrap>{k.label}</NoWrap>
    </button>
  );
}
