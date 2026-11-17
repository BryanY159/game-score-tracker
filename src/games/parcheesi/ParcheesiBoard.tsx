import { MinusIcon, PlusIcon } from '../../components/Icons';
import { NoWrap } from '../../components/NoWrap';
import { Avatar } from '../../components/PlayerPill';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { ordinal } from '../../domain/placement';
import { canStep, PAWNS, type ParcheesiState } from './scoring';

/** The pawns-home rows, shared by live play and editing a finished game (FR-6 AC-1). */
export function ParcheesiBoard({
  seats,
  state,
  onStep,
  disabled = false,
}: {
  seats: Seat[];
  state: ParcheesiState;
  onStep: (playerId: string, delta: 1 | -1) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
      {seats.map(({ player, mp }) => {
        const p = state.players.find((x) => x.playerId === player.id)!;
        const placed = p.placement !== null;
        return (
          <li
            key={mp.id}
            className="flex min-h-[68px] items-center gap-2.5 rounded-[28px] py-3 pr-2 pl-2 text-white"
            style={{ background: COLOR_HEX[mp.color] }}
          >
            <Avatar emoji={player.emoji} size={44} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <NoWrap truncate className="text-lg font-extrabold">
                {player.name}
              </NoWrap>
              {placed && p.pawnsHome === PAWNS ? (
                <NoWrap truncate className="text-[13px]">
                  All 4 pawns home
                </NoWrap>
              ) : (
                <PawnDots n={p.pawnsHome} />
              )}
            </div>
            {placed ? (
              <NoWrap className="tabular flex h-10 items-center rounded-[20px] bg-white px-4 text-lg font-extrabold text-[#1F2430]">
                {ordinal(p.placement!)}
              </NoWrap>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Remove a pawn from home for ${player.name}`}
                  disabled={disabled || !canStep(state, player.id, -1)}
                  onClick={() => onStep(player.id, -1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-white disabled:opacity-35"
                >
                  <MinusIcon width={20} height={20} />
                </button>
                <span className="tabular w-7 text-center text-[26px] font-extrabold" aria-label={`${p.pawnsHome} pawns home`}>
                  {p.pawnsHome}
                </span>
                <button
                  type="button"
                  aria-label={`Add a pawn home for ${player.name}`}
                  disabled={disabled || !canStep(state, player.id, 1)}
                  onClick={() => onStep(player.id, 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white disabled:opacity-35"
                  style={{ color: COLOR_HEX[mp.color] }}
                >
                  <PlusIcon width={20} height={20} />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PawnDots({ n }: { n: number }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${n} of ${PAWNS} pawns home`}>
      {Array.from({ length: PAWNS }, (_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full ${i < n ? 'bg-white' : 'border-2 border-white'}`} />
      ))}
    </div>
  );
}
