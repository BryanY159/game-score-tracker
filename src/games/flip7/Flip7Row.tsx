import { NoWrap } from '../../components/NoWrap';
import { CountUp } from '../../components/CountUp';
import { CrownIcon } from '../../components/Icons';
import { Avatar } from '../../components/PlayerPill';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { flip7Score, hasFlip7, isEntered, type Flip7Raw } from './scoring';

/** One player in the round (mockup Main.dc.html): this round's entry, then the total. */
export function Flip7Row({
  seat,
  raw,
  total,
  target,
  showTarget,
  dealer,
  active,
  compact,
  onSelect,
  disabled,
  leader = false,
  crownPop = false,
}: {
  /** The current leader gets a crown (FR-19 AC-2); it pops in when the lead changes. */
  leader?: boolean;
  crownPop?: boolean;
  seat: Seat;
  raw: Flip7Raw;
  total: number;
  target: number;
  showTarget: boolean;
  dealer: boolean;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const name = seat.player.name;
  const entry = raw.bust ? 'Bust' : isEntered(raw) ? `+${flip7Score(raw)}` : active ? 'entering' : '–';
  const sub = [showTarget ? `to ${target}` : null, dealer ? 'deals' : null].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`${name}, this round ${entry}, total ${total}`}
      className={`flex w-full items-center gap-2.5 rounded-[28px] pr-4 pl-2 text-left text-white ${compact ? 'h-12' : 'h-14'}`}
      style={{
        background: COLOR_HEX[seat.mp.color],
        boxShadow: active ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)' : undefined,
      }}
    >
      <Avatar emoji={seat.player.emoji} size={compact ? 34 : 40} />
      <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
        <span className="flex min-w-0 items-center gap-1.5">
          <NoWrap truncate className="text-[17px] font-bold">
            {name}
          </NoWrap>
          {leader && (
            <span className={`shrink-0 ${crownPop ? 'crown-pop' : ''}`}>
              <CrownIcon width={16} height={16} role="img" aria-label="Leader" />
            </span>
          )}
        </span>
        {sub && <NoWrap className="text-[13px]">{sub}</NoWrap>}
      </div>
      {hasFlip7(raw) && <NoWrap className="text-[13px] font-extrabold">Flip 7</NoWrap>}
      <NoWrap className="tabular rounded-xl bg-white/22 px-2.5 py-0.5 text-[15px] font-bold">{entry}</NoWrap>
      <CountUp value={total} data-nowrap="" className="tabular min-w-10 text-right text-[22px] font-extrabold whitespace-nowrap" aria-label={`${name} total`} />
    </button>
  );
}
