import { CountStepper } from '../../components/CountStepper';
import { NoWrap } from '../../components/NoWrap';
import { CountUp } from '../../components/CountUp';
import { CrownIcon } from '../../components/Icons';
import { Avatar } from '../../components/PlayerPill';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { signed } from '../../domain/targets';
import { BLITZ_MAX, blitzRoundScore, DUTCH_MAX, type BlitzInput } from './scoring';

/** One player's round entry (FR-9 AC-1, AC-2): colored header, then Dutch and Blitz steppers. */
export function BlitzCard({
  seat,
  input,
  total,
  target,
  showTarget,
  onChange,
  disabled = false,
  leader = false,
  crownPop = false,
}: {
  leader?: boolean;
  crownPop?: boolean;
  seat: Seat;
  input: BlitzInput;
  total: number | null;
  target: number;
  showTarget: boolean;
  onChange: (i: BlitzInput) => void;
  disabled?: boolean;
}) {
  const name = seat.player.name;
  const blitzed = input.blitz === 0 && input.dutch > 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-3xl border-[1.5px] border-border p-1.5">
      <div
        className="flex h-11 items-center gap-2 rounded-[20px] pr-3.5 pl-1.5 text-white"
        style={{ background: COLOR_HEX[seat.mp.color] }}
      >
        <Avatar emoji={seat.player.emoji} size={32} />
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <NoWrap truncate className="text-base font-bold">
            {name}
          </NoWrap>
          {leader && (
            <span className={`shrink-0 self-center ${crownPop ? 'crown-pop' : ''}`}>
              <CrownIcon width={15} height={15} role="img" aria-label="Leader" />
            </span>
          )}
          {blitzed ? (
            <NoWrap className="text-[13px] font-bold">Blitz!</NoWrap>
          ) : showTarget ? (
            <NoWrap className="text-[13px]">to {target}</NoWrap>
          ) : null}
        </div>
        <NoWrap className="tabular rounded-[10px] bg-white/22 px-2 py-0.5 text-[14px] font-bold" aria-label={`${name} this round`}>
          {signed(blitzRoundScore(input))}
        </NoWrap>
        {total !== null && (
          <CountUp value={total} data-nowrap="" className="tabular min-w-10 text-right text-[22px] font-extrabold whitespace-nowrap" aria-label={`${name} total`} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <CountStepper
          label="Dutch +1"
          name={`Dutch cards for ${name}`}
          value={input.dutch}
          max={DUTCH_MAX}
          disabled={disabled}
          onChange={(dutch) => onChange({ ...input, dutch })}
        />
        <CountStepper
          label="Blitz −2"
          name={`Blitz cards for ${name}`}
          value={input.blitz}
          max={BLITZ_MAX}
          disabled={disabled}
          onChange={(blitz) => onChange({ ...input, blitz })}
        />
      </div>
    </div>
  );
}
