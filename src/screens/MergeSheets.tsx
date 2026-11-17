import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { Sheet } from '../components/Sheet';
import { db } from '../db/schema';
import { gamesPlayedByPlayer, listPlayers } from '../db/repos/players';
import { mergePlayers, PlayerMergeError, sharedGames } from '../db/repos/merge';
import { COLOR_HEX } from '../domain/colors';
import type { MergePlan } from '../domain/backup/merge';
import type { Player } from '../domain/types';

/** FR-16 AC-2: what a merge would do, before anything changes. */
export function MergePreview({
  counts,
  from,
  onMerge,
  onClose,
  busy,
}: {
  counts: MergePlan['counts'];
  from: string;
  onMerge: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  const nothing = counts.added === 0 && counts.conflictsTakingIncoming === 0;
  const rows: [string, number][] = [
    ['New games', counts.newGames],
    ['New players', counts.newPlayers],
    ['Other new records', counts.added - counts.newGames - counts.newPlayers],
    ['Edited on both: newer there, taken', counts.conflictsTakingIncoming],
    ['Edited on both: newer here, kept', counts.conflictsKeepingLocal],
    ['Already the same', counts.unchanged],
  ];
  return (
    <Sheet
      title="Merge preview"
      onClose={onClose}
      footer={
        <Button className="flex-1" disabled={busy || nothing} onClick={onMerge}>
          {nothing ? 'Nothing to merge' : 'Merge'}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[15px] text-text-2">From the backup made {from}.</p>
        <ul className="m-0 flex list-none flex-col p-0" aria-label="Merge preview">
          {rows.map(([label, n]) => (
            <li key={label} className="flex min-h-11 items-center justify-between gap-3 border-b border-border last:border-b-0">
              <span className="text-[15px] leading-snug">{label}</span>
              <NoWrap className="tabular text-lg font-extrabold">{n}</NoWrap>
            </li>
          ))}
        </ul>
        <p className="m-0 rounded-2xl bg-surface px-3.5 py-3 text-[14px] leading-snug text-text-2">
          A backup of this device is saved automatically before merging, so it can be undone from Settings.
        </p>
      </div>
    </Sheet>
  );
}

/** FR-16 AC-4: after a merge, same-name players are offered for merging. */
export function MergeThese({ pairs, onDone }: { pairs: [Player, Player][]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [error, setError] = useState('');
  const games = useLiveQuery(() => gamesPlayedByPlayer(db), []);
  const pair = pairs[i];
  if (!pair) return null;
  // Keep the profile with more games; its name, emoji and color stay.
  const [a, b] = pair;
  const [keep, drop] = (games?.get(b.id) ?? 0) > (games?.get(a.id) ?? 0) ? [b, a] : [a, b];
  const next = () => {
    setError('');
    if (i + 1 < pairs.length) setI(i + 1);
    else onDone();
  };
  return (
    <Sheet title="Merge these?" closeLabel="Close" onClose={onDone}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[15px] leading-snug text-text-2">
          Two players are called {keep.name}. If they're the same person, merge them so their history is in one profile.
        </p>
        {[keep, drop].map((p) => (
          <div key={p.id} className="flex h-14 items-center gap-2.5 rounded-[28px] pr-4 pl-2 text-white" style={{ background: COLOR_HEX[p.color] }}>
            <Avatar emoji={p.emoji} />
            <NoWrap truncate className="flex-1 text-[17px] font-bold">
              {p.name}
            </NoWrap>
            <NoWrap className="text-[14px]">
              {games?.get(p.id) ?? 0} {games?.get(p.id) === 1 ? 'game' : 'games'}
            </NoWrap>
          </div>
        ))}
        {error && (
          <p role="alert" className="m-0 text-[14px] font-bold">
            {error}
          </p>
        )}
        <Button
          onClick={async () => {
            try {
              await mergePlayers(db, keep.id, drop.id);
              next();
            } catch (e) {
              setError(e instanceof PlayerMergeError ? e.message : 'They could not be merged.');
            }
          }}
        >
          Merge into one
        </Button>
        <Button variant="outline" onClick={next}>
          Keep both
        </Button>
        {pairs.length > 1 && (
          <p className="m-0 text-center text-[13px] text-text-2">
            {i + 1} of {pairs.length}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/** Settings tool (AC-4): merge two players at any time. */
export function MergePlayersTool({ onClose }: { onClose: () => void }) {
  const players = useLiveQuery(() => listPlayers(db), []);
  const [keep, setKeep] = useState<string | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState('');
  const name = (id: string | null) => players?.find((p) => p.id === id)?.name ?? '';

  async function check() {
    setError('');
    if (keep && drop && (await sharedGames(db, keep, drop)).length) setError('They played in the same game, so they must be different people.');
    else setConfirm(true);
  }

  return (
    <Sheet title="Merge players" closeLabel="Close" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[15px] leading-snug text-text-2">Same person saved twice? Their history moves into the profile you keep.</p>
        <PlayerChoice label="Keep" players={players ?? []} value={keep} disabled={drop} onChange={setKeep} />
        <PlayerChoice label="Merge in and remove" players={players ?? []} value={drop} disabled={keep} onChange={setDrop} />
        {error && (
          <p role="alert" className="m-0 text-[14px] font-bold">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="m-0 text-[14px] text-text-2">
            {done}
          </p>
        )}
        <Button disabled={!keep || !drop} onClick={check}>
          Merge
        </Button>
      </div>
      {confirm && keep && drop && (
        <ConfirmDialog
          title={`Merge ${name(drop)} into ${name(keep)}?`}
          body={`${name(drop)}'s games move to ${name(keep)}, and ${name(drop)} is removed. A backup is saved first.`}
          confirmLabel="Merge"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            setConfirm(false);
            try {
              const n = await mergePlayers(db, keep, drop);
              setDone(`Merged. ${n} ${n === 1 ? 'game' : 'games'} moved to ${name(keep)}.`);
              setDrop(null);
            } catch (e) {
              setError(e instanceof PlayerMergeError ? e.message : 'They could not be merged.');
            }
          }}
        />
      )}
    </Sheet>
  );
}

function PlayerChoice({
  label,
  players,
  value,
  disabled,
  onChange,
}: {
  label: string;
  players: Player[];
  value: string | null;
  disabled: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-[15px] font-extrabold">{label}</h3>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={value === p.id}
            disabled={disabled === p.id}
            onClick={() => onChange(p.id)}
            className={`flex h-11 max-w-full items-center gap-1.5 rounded-[22px] pr-3.5 pl-1.5 text-[15px] font-bold disabled:opacity-30 ${
              value === p.id ? 'bg-btn text-btn-text' : 'border-[1.5px] border-border text-text'
            }`}
          >
            <span className="rounded-full" style={{ background: COLOR_HEX[p.color] }}>
              <Avatar emoji={p.emoji} size={30} />
            </span>
            <NoWrap truncate>{p.name}</NoWrap>
          </button>
        ))}
      </div>
    </section>
  );
}
