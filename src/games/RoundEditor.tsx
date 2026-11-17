import { useState } from 'react';
import { Button } from '../components/Button';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { Sheet } from '../components/Sheet';
import type { Seat } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import type { GameKey, Round, RoundEntry } from '../domain/types';
import { RoundEditSheet } from './dutchBlitz/RoundsSheets';
import { FLIP7_BONUS, flip7Entry, flip7Score, hasFlip7, rawOf, type Flip7Raw } from './flip7/scoring';
import { EntryPanel, type Panel } from './flip7/EntryPanel';

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

/**
 * A past Flip 7 round (FR-8 AC-8): pick a player, then the keypad opens for
 * them by default; Back to cards switches to the card selector.
 */
function Flip7RoundEdit({ seats, round, onSave, onClose }: { seats: Seat[]; round: Round; onSave: (e: RoundEntry[]) => void; onClose: () => void }) {
  const [raws, setRaws] = useState<Record<string, Flip7Raw>>(() =>
    Object.fromEntries(seats.map((s) => [s.player.id, rawOf(round.entries.find((x) => x.playerId === s.player.id), 'number')])),
  );
  const [active, setActive] = useState(seats[0]!.player.id);
  const [panel, setPanel] = useState<Panel>('keypad');
  const ids = seats.map((s) => s.player.id);
  const raw = raws[active]!;
  const set = (r: Flip7Raw) => setRaws((x) => ({ ...x, [active]: r }));
  const next = () => setActive(ids[(ids.indexOf(active) + 1) % ids.length]!);
  const shown: Flip7Raw =
    panel === 'keypad'
      ? raw.mode === 'number'
        ? raw
        : // A cards round opens on the keypad with its score typed in, so it can be corrected.
          { mode: 'number', value: raw.bust ? null : flip7Score(raw) - (hasFlip7(raw) ? FLIP7_BONUS : 0), bust: raw.bust, flip7: hasFlip7(raw) }
      : raw.mode === 'cards'
        ? raw
        : { mode: 'cards', cards: [], mods: [], x2: false, bust: raw.bust };
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
      <div className="flex flex-col gap-2">
        {seats.map((s) => {
          const r = raws[s.player.id]!;
          const on = s.player.id === active;
          return (
            <button
              key={s.mp.id}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(s.player.id)}
              className="flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-left text-white"
              style={{ background: COLOR_HEX[s.mp.color], boxShadow: on ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)' : undefined }}
            >
              <Avatar emoji={s.player.emoji} size={36} />
              <NoWrap truncate className="flex-1 text-base font-bold">
                {s.player.name}
              </NoWrap>
              <NoWrap className="tabular text-[17px] font-extrabold">{r.bust ? 'Bust' : flip7Score(r)}</NoWrap>
            </button>
          );
        })}
        <EntryPanel
          name={seats.find((s) => s.player.id === active)!.player.name}
          raw={shown}
          panel={panel}
          onPanel={setPanel}
          onChange={set}
          onBust={() => {
            set(panel === 'keypad' ? { mode: 'number', value: null, bust: true, flip7: false } : { ...(shown as Extract<Flip7Raw, { mode: 'cards' }>), bust: true });
            next();
          }}
          onNext={next}
        />
      </div>
    </Sheet>
  );
}
