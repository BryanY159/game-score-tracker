import { NoWrap } from '../../components/NoWrap';
import { MODIFIERS, NUMBER_CARDS, toggleMod, type Flip7Raw } from './scoring';

type Cards = Extract<Flip7Raw, { mode: 'cards' }>;

const KEY = 'tabular flex h-11 items-center justify-center rounded-xl text-[18px] font-bold';
const off = 'bg-surface text-text';
const on = 'bg-btn text-btn-text ring-2 ring-text';

/** FR-8 AC-2: tap the cards a player kept this round. */
export function CardsPad({
  raw,
  onNumber,
  onChange,
  onBust,
  next,
}: {
  raw: Cards;
  onNumber: (n: number) => void;
  onChange: (r: Cards) => void;
  onBust: () => void;
  next: { label: string; onPress: () => void };
}) {
  const locked = raw.bust;
  return (
    <div className="grid grid-cols-5 gap-1" role="group" aria-label="Cards">
      {NUMBER_CARDS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Card ${n}`}
          aria-pressed={raw.cards.includes(n)}
          disabled={locked}
          onClick={() => onNumber(n)}
          className={`${KEY} ${raw.cards.includes(n) ? on : off} disabled:opacity-40`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={raw.x2}
        disabled={locked}
        onClick={() => onChange({ ...raw, x2: !raw.x2 })}
        className={`${KEY} ${raw.x2 ? on : off} disabled:opacity-40`}
      >
        ×2
      </button>
      <button
        type="button"
        aria-label="Remove last card"
        disabled={locked || raw.cards.length === 0}
        onClick={() => onChange({ ...raw, cards: raw.cards.slice(0, -1) })}
        className={`${KEY} ${off} disabled:opacity-40`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 5H9l-6 7 6 7h12z" />
          <path d="M17 9l-6 6M11 9l6 6" />
        </svg>
      </button>
      {MODIFIERS.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={raw.mods.includes(m)}
          disabled={locked}
          onClick={() => onChange(toggleMod(raw, m) as Cards)}
          className={`${KEY} ${raw.mods.includes(m) ? on : off} disabled:opacity-40`}
        >
          +{m}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={raw.bust}
        onClick={onBust}
        className={`col-span-2 flex h-11 items-center justify-center rounded-xl border-[1.5px] border-text text-[16px] font-extrabold ${
          raw.bust ? 'bg-text text-bg' : 'text-text'
        }`}
      >
        <NoWrap>Bust</NoWrap>
      </button>
      <button
        type="button"
        onClick={next.onPress}
        className="col-span-3 flex h-11 items-center justify-center rounded-xl bg-btn text-[16px] font-extrabold text-btn-text"
      >
        <NoWrap>{next.label}</NoWrap>
      </button>
    </div>
  );
}
