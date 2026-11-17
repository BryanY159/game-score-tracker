import { CountStepper } from '../../components/CountStepper';
import { NoWrap } from '../../components/NoWrap';
import { Avatar } from '../../components/PlayerPill';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { ordinal } from '../../domain/placement';
import { PAWNS, type ParcheesiState } from './scoring';

export const MAX_TRIPLE_DOUBLETS = 99;

/**
 * One card per player: pawns home (FR-6 AC-1) and triple doublets (AC-6).
 * Shared by live play and editing a finished game.
 */
export function ParcheesiBoard({
  seats,
  state,
  onPawns,
  onTripleDoublets,
  disabled = false,
}: {
  seats: Seat[];
  state: ParcheesiState;
  onPawns: (playerId: string, delta: 1 | -1) => void;
  onTripleDoublets: (playerId: string, delta: number) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 md:grid-cols-2">
      {seats.map(({ player, mp }) => {
        const p = state.players.find((x) => x.playerId === player.id)!;
        const placed = p.placement !== null;
        return (
          <li key={mp.id} className="flex flex-col gap-1.5 rounded-3xl border-[1.5px] border-border p-1.5">
            <div className="flex h-14 items-center gap-2.5 rounded-[22px] pr-2 pl-1.5 text-white" style={{ background: COLOR_HEX[mp.color] }}>
              <Avatar emoji={player.emoji} size={40} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <NoWrap truncate className="text-lg leading-tight font-extrabold">
                  {player.name}
                </NoWrap>
                {placed && p.pawnsHome === PAWNS ? (
                  <NoWrap className="text-[13px]">All 4 pawns home</NoWrap>
                ) : (
                  <PawnDots n={p.pawnsHome} />
                )}
              </div>
              {placed && (
                <NoWrap className="tabular flex h-10 items-center rounded-[20px] bg-white px-4 text-lg font-extrabold text-[#1F2430]">
                  {ordinal(p.placement!)}
                </NoWrap>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <CountStepper
                label="Pawns home"
                name={`pawns home for ${player.name}`}
                value={p.pawnsHome}
                min={0}
                max={PAWNS}
                typeable={false}
                disabled={disabled || placed || state.complete}
                onChange={(v) => {
                  if (v !== p.pawnsHome) onPawns(player.id, v > p.pawnsHome ? 1 : -1);
                }}
              />
              <CountStepper
                label="Triple doublets"
                name={`triple doublets for ${player.name}`}
                value={p.tripleDoublets}
                min={0}
                max={MAX_TRIPLE_DOUBLETS}
                disabled={disabled}
                onChange={(v) => {
                  if (v !== p.tripleDoublets) onTripleDoublets(player.id, v - p.tripleDoublets);
                }}
              />
            </div>
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
