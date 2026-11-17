import { useState } from 'react';
import { Button } from '../components/Button';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { Sheet } from '../components/Sheet';
import type { Seat } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import type { GameKey, Round, RoundEntry } from '../domain/types';
import { RoundEditSheet } from './dutchBlitz/RoundsSheets';
import { FLIP7_BONUS, flip7Entry, flip7Score, type Flip7Raw } from './flip7/scoring';

/** Edit one past round (FR-5 AC-4), with the right inputs for the game. */
export function RoundEditor(props: {
  gameKey: GameKey;
  seats: Seat[];
  round: Round;
  onSave: (entries: RoundEntry[]) => void;
  onClose: () => void;
}) {
  if (props.gameKey === 'flip7') return <Flip7RoundEdit {...props} />;
  return <RoundEditSheet {...props} />;
}

type NumberRaw = Extract<Flip7Raw, { mode: 'number' }>;

/**
 * A past Flip 7 round is edited as Number entry: the score before the Flip 7 bonus,
 * plus Bust and Flip 7! (spec FR-8 AC-6).
 */
function Flip7RoundEdit({ seats, round, onSave, onClose }: { seats: Seat[]; round: Round; onSave: (e: RoundEntry[]) => void; onClose: () => void }) {
  const [raws, setRaws] = useState<Record<string, NumberRaw>>(() =>
    Object.fromEntries(
      seats.map((s) => {
        const e = round.entries.find((x) => x.playerId === s.player.id);
        const flip7 = e?.flags.includes('flip7') ?? false;
        const bust = e?.flags.includes('bust') ?? false;
        return [s.player.id, { mode: 'number', value: bust ? null : (e?.score ?? 0) - (flip7 ? FLIP7_BONUS : 0), bust, flip7 } satisfies NumberRaw];
      }),
    ),
  );
  const upd = (id: string, patch: Partial<NumberRaw>) => setRaws((x) => ({ ...x, [id]: { ...x[id]!, ...patch } }));
  return (
    <Sheet
      title={`Edit round ${round.number}`}
      onClose={onClose}
      footer={
        <Button className="flex-1" onClick={() => onSave(seats.map((s) => flip7Entry(s.player.id, raws[s.player.id]!)))}>
          Save round
        </Button>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {seats.map((s) => {
          const r = raws[s.player.id]!;
          return (
            <li key={s.mp.id} className="flex flex-col gap-1.5 rounded-3xl border-[1.5px] border-border p-1.5">
              <div className="flex h-11 items-center gap-2 rounded-[20px] pr-3.5 pl-1.5 text-white" style={{ background: COLOR_HEX[s.mp.color] }}>
                <Avatar emoji={s.player.emoji} size={32} />
                <NoWrap truncate className="flex-1 text-base font-bold">
                  {s.player.name}
                </NoWrap>
                <NoWrap className="tabular text-[17px] font-extrabold">{flip7Score(r)}</NoWrap>
              </div>
              <div className="flex items-center gap-2">
                <input
                  aria-label={`${s.player.name} score`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={r.bust}
                  value={r.value ?? ''}
                  placeholder="0"
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 3);
                    upd(s.player.id, { value: d === '' ? null : Number(d) });
                  }}
                  className="tabular h-11 w-24 rounded-[14px] border-[1.5px] border-border bg-surface px-3 text-right text-xl font-extrabold text-text outline-none focus:border-text disabled:opacity-40"
                />
                <Toggle label="Bust" on={r.bust} onClick={() => upd(s.player.id, { bust: !r.bust, flip7: false })} />
                <Toggle label="Flip 7!" on={r.flip7} onClick={() => upd(s.player.id, { flip7: !r.flip7, bust: false })} />
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-11 flex-1 rounded-[14px] border-[1.5px] border-text text-[15px] font-extrabold ${on ? 'bg-text text-bg' : 'text-text'}`}
    >
      <NoWrap>{label}</NoWrap>
    </button>
  );
}
