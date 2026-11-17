import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameHeader } from '../components/GameChrome';
import { NoWrap } from '../components/NoWrap';
import { Toggle } from '../components/Pickers';
import { Segmented } from '../components/Segmented';
import { Stepper } from '../components/Stepper';
import { db } from '../db/schema';
import { readSettings, updateSettings } from '../db/repos/settings';
import { exportAll, markBackedUp, restoreAll } from '../domain/backup/backup';
import { backupFileName, BackupFormatError, parseBackup, summarize, type BackupFile } from '../domain/backup/format';
import { backupStatus } from '../domain/backup/reminder';
import { relativeDay } from '../domain/dates';
import { saveFile } from '../pwa/share';

/** Settings and backup (FR-15, FR-17, FR-14 AC-3 setting). */
export function Settings() {
  const data = useLiveQuery(async () => {
    const settings = await readSettings(db);
    const matches = await db.matches.toArray();
    return { settings, status: backupStatus(settings, matches) };
  }, []);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!data) return null;
  const { settings, status } = data;
  const reminder = settings.backupReminder;

  async function exportBackup() {
    setBusy(true);
    setMessage(null);
    try {
      const now = Date.now();
      const file = await exportAll(db, now);
      const result = await saveFile(JSON.stringify(file), backupFileName(now));
      if (result === 'cancelled') return;
      await markBackedUp(db, now);
      setMessage({ text: result === 'shared' ? 'Backup saved.' : 'Backup downloaded.' });
    } catch {
      setMessage({ text: "The backup couldn't be saved. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function pickRestore(f: File | undefined) {
    if (!f) return;
    setMessage(null);
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      setMessage({ text: e instanceof BackupFormatError ? e.message : "That file couldn't be read.", error: true });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    await restoreAll(db, pending);
    setPending(null);
    setMessage({ text: 'Backup restored.' });
  }

  const pendingSummary = pending && summarize(pending.tables);

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <GameHeader title="Settings" />
      <div className="flex flex-col gap-[18px] px-4">
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[17px] font-extrabold">Backup</h2>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-surface px-3.5 py-3">
            <NoWrap truncate className="text-[15px] font-bold">
              {settings.lastBackupAt ? `Last backup ${relativeDay(settings.lastBackupAt)}` : 'Not backed up yet'}
            </NoWrap>
            <NoWrap truncate className="text-[13px] text-text-2">
              {settings.lastBackupAt ? `${plural(status.gamesSince, 'game')} since then · ` : ''}
              {plural(status.totalGames, 'game')} saved
            </NoWrap>
          </div>
          <Button size="lg" className="h-[52px] text-base" disabled={busy} onClick={exportBackup}>
            Export backup file
          </Button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-16 flex-col items-center justify-center rounded-2xl border-[1.5px] border-border leading-tight text-text"
          >
            <NoWrap className="text-[15px] font-extrabold">Restore</NoWrap>
            <NoWrap className="text-xs text-text-2">Replace all data</NoWrap>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="Backup file"
            onChange={(e) => pickRestore(e.target.files?.[0])}
          />
          {message && (
            <p role={message.error ? 'alert' : 'status'} className={`m-0 text-[14px] ${message.error ? 'font-bold text-text' : 'text-text-2'}`}>
              {message.text}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[17px] font-extrabold">Reminders</h2>
          <div className="flex flex-col rounded-2xl border-[1.5px] border-border px-3.5">
            <div className="flex min-h-14 items-center justify-between gap-3">
              <NoWrap className="text-[15px]">Remind me to back up</NoWrap>
              <Toggle
                label="Remind me to back up"
                checked={reminder.enabled}
                onChange={(enabled) => updateSettings(db, { backupReminder: { ...reminder, enabled } })}
              />
            </div>
            {reminder.enabled && (
              <>
                <div className="flex min-h-14 items-center justify-between gap-3 border-t border-border">
                  <NoWrap className="text-[15px]">Every</NoWrap>
                  <Segmented
                    label="Remind every"
                    value={reminder.mode}
                    onChange={(mode) => updateSettings(db, { backupReminder: { ...reminder, mode } })}
                    options={[
                      { value: 'games', label: `${reminder.everyGames} games` },
                      { value: 'month', label: 'Month' },
                    ]}
                  />
                </div>
                {reminder.mode === 'games' && (
                  <div className="flex min-h-14 items-center justify-between gap-3 border-t border-border py-1.5">
                    <NoWrap className="text-[15px]">Games between</NoWrap>
                    <Stepper
                      label="games between reminders"
                      value={reminder.everyGames}
                      min={1}
                      max={50}
                      onChange={(everyGames) => updateSettings(db, { backupReminder: { ...reminder, everyGames } })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[17px] font-extrabold">Stats</h2>
          <div className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-border py-2 pr-2 pl-3.5">
            <div className="flex min-w-0 flex-col">
              <NoWrap className="text-[15px]">Minimum games</NoWrap>
              <NoWrap truncate className="text-[13px] text-text-2">
                Before a player's stats show
              </NoWrap>
            </div>
            <Stepper
              label="games"
              value={settings.statsMinGames}
              min={1}
              max={20}
              onChange={(statsMinGames) => updateSettings(db, { statsMinGames })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[17px] font-extrabold">Appearance</h2>
          <p className="m-0 rounded-2xl bg-surface px-3.5 py-3 text-[14px] leading-snug text-text-2">
            Light and dark mode follow your device setting. Animations turn off when Reduce Motion is on.
          </p>
        </section>

        <p className="m-0 text-center text-[12px] text-text-2">Version {__APP_VERSION__}</p>
      </div>

      {pending && pendingSummary && (
        <ConfirmDialog
          title="Replace all data?"
          body={`Everything on this device will be replaced by the backup from ${relativeDay(pending.exportedAt)}: ${plural(
            pendingSummary.games,
            'game',
          )} and ${plural(pendingSummary.players, 'player')}. This can't be undone.`}
          confirmLabel="Replace"
          onCancel={() => setPending(null)}
          onConfirm={confirmRestore}
        />
      )}
    </div>
  );
}

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}
