import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { NoWrap } from '../../components/NoWrap';
import { FLIP7_BONUS, FLIP7_UNIQUE, MODIFIERS, NUMBER_CARDS, flip7Score, hasFlip7, tapNumber, toggleMod, type Flip7Raw } from './scoring';
import { FLIP7 } from './tokens';

type Cards = Extract<Flip7Raw, { mode: 'cards' }>;
type Typed = Extract<Flip7Raw, { mode: 'number' }>;
export type Panel = 'cards' | 'keypad';

const blankCards: Cards = { mode: 'cards', cards: [], mods: [], x2: false, bust: false };
const blankTyped: Typed = { mode: 'number', value: null, bust: false, flip7: false };
const ring = '0 0 0 3px var(--surface), 0 0 0 5px #1F2430';
const outlined = (width: number) => ({ WebkitTextStroke: `${width}px ${FLIP7.numeralOutline}`, paintOrder: 'stroke fill' as const });

/** "(3+5+8+12) + 4 = 32", "2×(3+5) + 4 + 15 = 35", "Typed 23", "Bust". */
export function sumLine(raw: Flip7Raw): string {
  if (raw.bust) return 'Bust';
  if (raw.mode === 'number') return raw.value === null ? 'Not entered' : `Typed ${raw.value}${raw.flip7 ? ` + ${FLIP7_BONUS}` : ''}`;
  if (!raw.cards.length && !raw.mods.length) return 'No cards yet';
  const nums = raw.cards.length ? `${raw.x2 ? '2×' : ''}(${raw.cards.join('+')})` : '';
  const parts = [nums, ...raw.mods.map(String), ...(hasFlip7(raw) ? [String(FLIP7_BONUS)] : [])].filter(Boolean);
  return `${parts.join(' + ')} =`;
}

/**
 * The Flip 7 entry panel (FR-8): the card selector (mockup Flip7Cards) and the
 * keypad (Flip7Keypad), shared by play and the past-round editor.
 */
export function EntryPanel({
  name,
  raw,
  panel,
  onPanel,
  onChange,
  onBust,
  onNext,
  nextLabel = 'Next player',
  note,
}: {
  /** Shown instead of "No cards yet", e.g. "Typed 31" when the score came from the keypad. */
  note?: string;
  name: string;
  raw: Flip7Raw;
  panel: Panel;
  onPanel: (p: Panel) => void;
  onChange: (r: Flip7Raw) => void;
  /** Bust, then move on. */
  onBust: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [bustAsk, setBustAsk] = useState<number | null>(null);
  const cards = raw.mode === 'cards' ? raw : blankCards;
  const typed = raw.mode === 'number' ? raw : blankTyped;
  const input = useRef<HTMLInputElement>(null);

  if (panel === 'keypad') {
    const text = typed.value === null ? '' : String(typed.value);
    const setValue = (v: number | null) => onChange({ ...typed, value: v, bust: false });
    const digit = (d: string) => (
      <button key={d} type="button" onClick={() => (text.length < 3 ? setValue(Number((text === '0' ? '' : text) + d)) : undefined)} className="tabular h-12 rounded-[14px] bg-bg text-[22px] font-bold text-text">
        {d}
      </button>
    );
    return (
      <div className="flex flex-col gap-2 rounded-[24px] bg-surface p-3" role="group" aria-label={`${name}'s score keypad`}>
        <div className="flex items-center justify-between gap-2">
          <NoWrap truncate className="text-[15px] font-bold">
            {name}
          </NoWrap>
          <button type="button" onClick={() => onPanel('cards')} className="flex h-11 shrink-0 items-center gap-1.5 rounded-[22px] border-[1.5px] border-text bg-bg px-3 text-[14px] font-extrabold text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="8" height="12" rx="2" />
              <rect x="13" y="7" width="8" height="12" rx="2" />
            </svg>
            <NoWrap>Back to cards</NoWrap>
          </button>
        </div>
        <input
          ref={input}
          aria-label={`${name}'s round score`}
          inputMode="numeric"
          pattern="[0-9]*"
          value={typed.bust ? '' : text}
          placeholder={typed.bust ? 'Bust' : '0'}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 3);
            setValue(d === '' ? null : Number(d));
          }}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          className="tabular h-12 w-full bg-transparent text-center text-[40px] leading-none font-extrabold text-text outline-none placeholder:text-text-2"
        />
        <div className="grid grid-cols-4 gap-1.5">
          {['1', '2', '3'].map(digit)}
          <button type="button" onClick={onBust} className="h-12 rounded-[14px] text-[16px] font-extrabold" style={{ background: FLIP7.bust, color: FLIP7.bustText }}>
            <NoWrap>Bust</NoWrap>
          </button>
          {['4', '5', '6'].map(digit)}
          <button
            type="button"
            aria-pressed={typed.flip7}
            onClick={() => onChange({ ...typed, flip7: !typed.flip7, bust: false })}
            className={`h-12 rounded-[14px] border-[1.5px] border-text text-[15px] font-extrabold ${typed.flip7 ? 'bg-text text-bg' : 'bg-bg text-text'}`}
          >
            <NoWrap>Flip 7!</NoWrap>
          </button>
          {['7', '8', '9'].map(digit)}
          <button type="button" aria-label="Delete" onClick={() => setValue(text.length > 1 ? Number(text.slice(0, -1)) : null)} className="flex h-12 items-center justify-center rounded-[14px] bg-bg text-text">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 5H9l-6 7 6 7h12z" />
              <path d="M17 9l-6 6M11 9l6 6" />
            </svg>
          </button>
          <span />
          {digit('0')}
          <NextButton label={nextLabel} onClick={onNext} />
        </div>
      </div>
    );
  }

  const full = new Set(cards.cards).size >= FLIP7_UNIQUE;
  return (
    <div className="flex flex-col gap-2 rounded-[24px] bg-surface p-3" role="group" aria-label={`${name}'s cards`}>
      <div className="flex items-baseline justify-between gap-2">
        <NoWrap truncate className="text-[15px] font-bold">
          {name}'s cards
        </NoWrap>
        <NoWrap className="text-[14px] text-text-2" aria-label="Round sum">
          {note && raw.mode === 'cards' && !raw.cards.length && !raw.mods.length && !raw.bust ? note : sumLine(raw)}
          {!raw.bust && (raw.mode === 'cards' ? cards.cards.length + cards.mods.length > 0 : false) && (
            <b className="tabular ml-1 text-xl text-text">{flip7Score(raw)}</b>
          )}
        </NoWrap>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {NUMBER_CARDS.map((n) => {
          const on = cards.cards.includes(n);
          return (
            <button
              key={n}
              type="button"
              aria-label={`Card ${n}`}
              aria-pressed={on}
              disabled={cards.bust || (full && !on)}
              onClick={() => {
                const t = tapNumber(cards, n);
                if (t.kind === 'added') onChange(t.raw);
                else if (t.kind === 'duplicate') setBustAsk(n);
              }}
              className="tabular relative h-[52px] rounded-[10px] border-[1.5px] text-[28px] font-black disabled:opacity-40"
              style={{ background: FLIP7.numberCard, borderColor: FLIP7.numberCardBorder, color: FLIP7.numerals[n], boxShadow: on ? ring : undefined, ...outlined(1.5) }}
            >
              {n}
              {on && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: '#1F2430', WebkitTextStroke: '0' }} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round">
                    <path d="M5 12l5 5L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {[...MODIFIERS.map((m) => ({ key: `+${m}`, on: cards.mods.includes(m), press: () => onChange(toggleMod(cards, m)) })), { key: '×2', on: cards.x2, press: () => onChange({ ...cards, x2: !cards.x2 }) }].map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={m.on}
            disabled={cards.bust}
            onClick={m.press}
            className="tabular h-11 rounded-[10px] border-[1.5px] text-[20px] font-black disabled:opacity-40"
            style={{ background: FLIP7.modifierCard, borderColor: FLIP7.modifierCardBorder, color: FLIP7.modifierNumeral, boxShadow: m.on ? ring : undefined, ...outlined(1.2) }}
          >
            {m.key}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <button type="button" aria-pressed={raw.bust} onClick={onBust} className="h-12 rounded-[14px] text-[16px] font-extrabold" style={{ background: FLIP7.bust, color: FLIP7.bustText }}>
          <NoWrap>Bust</NoWrap>
        </button>
        <button type="button" onClick={() => onChange(blankCards)} className="h-12 rounded-[14px] border-[1.5px] border-text bg-bg text-[16px] font-bold text-text">
          <NoWrap>Clear</NoWrap>
        </button>
        <NextButton label={nextLabel} onClick={onNext} />
      </div>

      {bustAsk !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setBustAsk(null)}>
          <div role="alertdialog" aria-modal="true" aria-label="Bust?" className="flex w-full max-w-sm flex-col gap-3 rounded-[24px] bg-bg p-5 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
            <h2 className="m-0 text-xl font-extrabold">Bust?</h2>
            <p className="m-0 text-[15px] leading-snug text-text-2">
              {name} already has a {bustAsk}. A second one is a bust, unless a Second Chance card saved it.
            </p>
            <Button
              onClick={() => {
                setBustAsk(null);
                onBust();
              }}
            >
              Bust
            </Button>
            <Button variant="outline" onClick={() => setBustAsk(null)}>
              Not a bust, remove card
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="col-span-2 flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-btn text-[16px] font-extrabold text-btn-text">
      <NoWrap>{label}</NoWrap>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
