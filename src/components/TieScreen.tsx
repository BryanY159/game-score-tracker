import { useState } from 'react';
import { COLOR_HEX } from '../domain/colors';
import type { Seat } from '../db/repos/matches';
import { Button } from './Button';
import { Avatar } from './PlayerPill';
import { NoWrap } from './NoWrap';
import { Sheet } from './Sheet';

export type TieDecision = { kind: 'shared' } | { kind: 'picked'; winnerId: string };

/**
 * FR-11 AC-3: when a tie for first remains, choose a shared win or the winner
 * of an outside tie-breaker. Games can add their own options (Flip 7, M8).
 */
export function TieScreen({
  tied,
  reason,
  onDecide,
  onClose,
  playAnotherRound,
}: {
  /** Flip 7 (FR-11 AC-4): the default option, everyone plays one more round. */
  playAnotherRound?: () => void;
  tied: Seat[];
  reason: string;
  onDecide: (d: TieDecision) => void;
  onClose: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const names = tied.map((s) => s.player.name);
  return (
    <Sheet title="It's a tie" closeLabel="Back" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[15px] leading-snug text-text-2">
          {names.slice(0, -1).join(', ')} and {names[names.length - 1]} {reason}
        </p>
        {!picking ? (
          <div className="flex flex-col gap-2">
            {playAnotherRound && (
              <Button autoFocus onClick={playAnotherRound}>
                Play another round
              </Button>
            )}
            <Button variant={playAnotherRound ? 'outline' : 'primary'} onClick={() => onDecide({ kind: 'shared' })}>
              Shared win
            </Button>
            <Button variant="outline" onClick={() => setPicking(true)}>
              Pick the tie-breaker winner
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[15px] font-extrabold">Who won the tie-breaker?</p>
            {tied.map((s) => (
              <button
                key={s.mp.id}
                type="button"
                onClick={() => onDecide({ kind: 'picked', winnerId: s.player.id })}
                className="flex h-14 items-center gap-2.5 rounded-[28px] pr-4 pl-2 text-left text-white"
                style={{ background: COLOR_HEX[s.mp.color] }}
              >
                <Avatar emoji={s.player.emoji} />
                <NoWrap truncate className="flex-1 text-[17px] font-bold">
                  {s.player.name}
                </NoWrap>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
