import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ColorPicker, EmojiPicker, Toggle } from '../components/Pickers';
import { Avatar } from '../components/PlayerPill';
import { Sheet } from '../components/Sheet';
import { COLOR_HEX } from '../domain/colors';
import type { Player } from '../domain/types';
import { db } from '../db/schema';
import {
  createPlayer,
  deletePlayer,
  MAX_NAME_LENGTH,
  PlayerValidationError,
  updatePlayer,
  type PlayerInput,
} from '../db/repos/players';

/** Create or edit a profile (FR-2 AC-1, AC-2). */
export function PlayerEdit({
  player,
  initial,
  onClose,
}: {
  player?: Player;
  initial: PlayerInput;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PlayerInput>(player ?? initial);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<PlayerInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError('');
  };

  async function save() {
    try {
      if (player) await updatePlayer(db, player.id, form);
      else await createPlayer(db, form);
      onClose();
    } catch (e) {
      if (e instanceof PlayerValidationError) setError(e.message);
      else throw e;
    }
  }

  return (
    <Sheet
      title={player ? 'Edit player' : 'New player'}
      onClose={onClose}
      footer={
        <>
          {player && (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="rounded-full p-1" style={{ background: COLOR_HEX[form.color] }}>
            <Avatar emoji={form.emoji} size={48} />
          </span>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[13px] font-bold text-text-2">Name</span>
            <input
              value={form.name}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => set({ name: e.target.value })}
              className="h-11 w-full rounded-[14px] border-[1.5px] border-border bg-bg px-3 text-[17px] text-text outline-none focus:border-text"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="m-0 -mt-3 text-[14px] font-bold text-text">
            {error}
          </p>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[15px] font-extrabold">Emoji</h3>
          <EmojiPicker value={form.emoji} onChange={(emoji) => set({ emoji })} />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[15px] font-extrabold">Color</h3>
          <ColorPicker value={form.color} onChange={(color) => set({ color })} />
        </section>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col">
            <span className="text-[15px] font-extrabold">Hide from stats</span>
            <span className="text-[13px] leading-snug text-text-2">Games stay in history but don't count in leaderboards.</span>
          </div>
          <Toggle label="Hide from stats" checked={form.hideFromStats} onChange={(hideFromStats) => set({ hideFromStats })} />
        </div>
      </div>
      {confirmDelete && player && (
        <ConfirmDialog
          title={`Delete ${player.name}?`}
          body="Their past games stay in history. They won't appear in the player list."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deletePlayer(db, player.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
