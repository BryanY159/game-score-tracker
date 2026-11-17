import { useState } from 'react';
import { Button } from '../../components/Button';
import { NoWrap } from '../../components/NoWrap';
import { Sheet } from '../../components/Sheet';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { signed } from '../../domain/targets';
import type { Round, RoundEntry } from '../../domain/types';
import { BlitzCard } from './BlitzCard';
import { blitzEntry, blitzInput, type BlitzInput } from './scoring';

/** FR-5 AC-4: every confirmed round, each one opens for editing. */
export function RoundsSheet({
  seats,
  rounds,
  onOpen,
  onClose,
}: {
  seats: Seat[];
  rounds: Round[];
  onOpen: (r: Round) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Rounds" closeLabel="Close" onClose={onClose}>
      <RoundsList seats={seats} rounds={rounds} onOpen={onOpen} />
    </Sheet>
  );
}

/** Confirmed rounds with each player's score; tap one to edit it. */
export function RoundsList({ seats, rounds, onOpen }: { seats: Seat[]; rounds: Round[]; onOpen: (r: Round) => void }) {
  const confirmed = rounds.filter((r) => r.confirmed);
  if (confirmed.length === 0) return <p className="m-0 text-[15px] text-text-2">No rounds confirmed yet.</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-label="Rounds">
      {confirmed.map((r) => (
        <li key={r.id} className="border-b border-border last:border-b-0">
          <button
            type="button"
            onClick={() => onOpen(r)}
            aria-label={`Round ${r.number}`}
            className="flex min-h-14 w-full items-center gap-3 py-2 text-left text-text"
          >
            <NoWrap className="w-[74px] shrink-0 text-[15px] font-extrabold">Round {r.number}</NoWrap>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {seats.map((s) => {
                const e = r.entries.find((x) => x.playerId === s.player.id);
                return (
                  <NoWrap
                    key={s.mp.id}
                    className="tabular flex h-7 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-white"
                    style={{ background: COLOR_HEX[s.mp.color] }}
                  >
                    {s.player.emoji} {signed(e?.score ?? 0)}
                  </NoWrap>
                );
              })}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Edit one past round; totals and the end of the game are worked out again. */
export function RoundEditSheet({
  seats,
  round,
  onSave,
  onClose,
}: {
  seats: Seat[];
  round: Round;
  onSave: (entries: RoundEntry[]) => void;
  onClose: () => void;
}) {
  const [inputs, setInputs] = useState<Record<string, BlitzInput>>(() =>
    Object.fromEntries(seats.map((s) => [s.player.id, blitzInput(round.entries.find((e) => e.playerId === s.player.id))])),
  );
  return (
    <Sheet
      title={`Edit round ${round.number}`}
      onClose={onClose}
      footer={
        <Button className="flex-1" onClick={() => onSave(seats.map((s) => blitzEntry(s.player.id, inputs[s.player.id]!)))}>
          Save round
        </Button>
      }
    >
      <div className="flex flex-col gap-2.5">
        {seats.map((s) => (
          <BlitzCard
            key={s.mp.id}
            seat={s}
            input={inputs[s.player.id]!}
            total={null}
            target={0}
            showTarget={false}
            onChange={(i) => setInputs((x) => ({ ...x, [s.player.id]: i }))}
          />
        ))}
      </div>
    </Sheet>
  );
}
