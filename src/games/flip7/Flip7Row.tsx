import { CountUp } from '../../components/CountUp';
import { CrownIcon } from '../../components/Icons';
import { NoWrap } from '../../components/NoWrap';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { flip7Score, hasFlip7, isEntered, type Flip7Raw } from './scoring';

/**
 * One player in the round (mockups Flip7Cards, Flip7Keypad). Tapping the pill
 * selects the player for the card selector; the outlined round-score chip opens
 * the keypad for them (FR-8 AC-7).
 */
export function Flip7Row({
  seat,
  raw,
  total,
  target,
  showTarget,
  dealer,
  active,
  typing,
  compact,
  onSelect,
  onType,
  disabled,
  leader = false,
  crownPop = false,
}: {
  seat: Seat;
  raw: Flip7Raw;
  total: number;
  target: number;
  showTarget: boolean;
  dealer: boolean;
  active: boolean;
  /** The keypad is open for this player: the chip is shown filled. */
  typing: boolean;
  compact: boolean;
  onSelect: () => void;
  onType: () => void;
  disabled: boolean;
  leader?: boolean;
  crownPop?: boolean;
}) {
  const name = seat.player.name;
  const entry = raw.bust ? 'Bust' : isEntered(raw) ? `+${flip7Score(raw)}` : '–';
  const sub = [showTarget ? `to ${target}` : null, dealer ? 'deals' : null].filter(Boolean).join(' · ');
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-[24px] pr-3 pl-1.5 text-white ${compact ? 'h-12' : 'h-[52px]'}`}
      style={{
        background: COLOR_HEX[seat.mp.color],
        boxShadow: active ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)' : undefined,
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={active}
        aria-label={`${name}, this round ${entry}, total ${total}`}
        className="flex h-11 min-w-0 flex-1 items-center gap-2 text-left text-white"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/22 text-xl" aria-hidden="true">
          {seat.player.emoji}
        </span>
        <span className="flex min-w-0 flex-col leading-[1.15]">
          <span className="flex min-w-0 items-center gap-1.5">
            <NoWrap truncate className="text-base font-bold">
              {name}
            </NoWrap>
            {leader && (
              <span className={`shrink-0 ${crownPop ? 'crown-pop' : ''}`}>
                <CrownIcon width={16} height={16} role="img" aria-label="Leader" />
              </span>
            )}
            {hasFlip7(raw) && <NoWrap className="text-[12px] font-extrabold">Flip 7</NoWrap>}
          </span>
          {sub && <NoWrap className="text-[12px]">{sub}</NoWrap>}
        </span>
      </button>
      <button
        type="button"
        onClick={onType}
        disabled={disabled}
        aria-label={`Type ${name}'s round score`}
        className="flex h-11 shrink-0 items-center"
      >
        <span
          className={`tabular flex h-8 min-w-[52px] items-center justify-center rounded-2xl px-2.5 text-[15px] font-extrabold ${
            typing ? 'border-2 border-white bg-white text-[#1F2430]' : 'border-[1.5px] border-white/70 bg-white/18 text-white'
          }`}
        >
          {entry}
        </span>
      </button>
      <CountUp
        value={total}
        data-nowrap=""
        className="tabular min-w-12 text-right text-2xl font-extrabold whitespace-nowrap"
        aria-label={`${name} total`}
      />
    </div>
  );
}

