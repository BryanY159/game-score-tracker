import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PlusIcon, SettingsIcon } from '../components/Icons';
import { IconButton } from '../components/Button';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { EmptyState, ScreenHeader } from '../components/Screen';
import { db } from '../db/schema';
import { getMatchBundle, listInProgress, listRecentFinished, type MatchBundle } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import { relativeDay } from '../domain/dates';
import { resultLine } from '../domain/summary';
import { progressLine } from '../games/progress';
import { requireGame } from '../games/registry';
import { readSettings } from '../db/repos/settings';
import { backupStatus } from '../domain/backup/reminder';

export function Home() {
  const navigate = useNavigate();
  const inProgress = useLiveQuery(async () => {
    const matches = await listInProgress(db);
    const bundles = await Promise.all(matches.map((m) => getMatchBundle(db, m.id)));
    return bundles.filter((b): b is MatchBundle => b !== null);
  }, []);
  const recent = useLiveQuery(() => listRecentFinished(db, 3), []);
  const backup = useLiveQuery(async () => backupStatus(await readSettings(db), await db.matches.toArray()), []);

  return (
    <>
      <ScreenHeader
        title="Game Night"
        trailing={
          <IconButton label="Settings" onClick={() => navigate('/settings')}>
            <SettingsIcon />
          </IconButton>
        }
      />
      <div className="flex flex-col gap-3.5 px-4">
        <Button size="lg" icon={<PlusIcon />} onClick={() => navigate('/new')}>
          New game
        </Button>

        {inProgress && inProgress.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[17px] font-extrabold">In progress</h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {inProgress.map((b) => (
                <div key={b.match.id} className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-border p-3.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <NoWrap truncate className="text-[17px] font-extrabold">
                      {requireGame(b.match.gameKey).name}
                    </NoWrap>
                    <NoWrap truncate className="text-[14px] text-text-2">
                      {progressLine(b)}
                    </NoWrap>
                    <div className="flex gap-1" aria-label="Players">
                      {b.seats.map((s) => (
                        <span
                          key={s.mp.id}
                          title={s.player.name}
                          className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-sm"
                          style={{ background: COLOR_HEX[s.mp.color] }}
                        >
                          {s.player.emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/play/${b.match.id}`)}>
                    Resume
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {backup?.due && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface py-1.5 pr-1.5 pl-3.5">
            <span className="flex-1 text-[14px] leading-snug">
              {backup.gamesSince} {backup.gamesSince === 1 ? 'game' : 'games'}{' '}
              {backup.neverBackedUp ? 'not backed up yet' : 'since your last backup'}
            </span>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="h-11 shrink-0 px-2.5 text-[15px] font-extrabold text-text underline"
            >
              <NoWrap>Back up</NoWrap>
            </button>
          </div>
        )}

        {recent && recent.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] font-extrabold">Recent games</h2>
            <ul className="m-0 list-none p-0">
              {recent.map((b) => {
                const winner = b.seats.find((s) => s.mp.isWinner) ?? b.seats[0];
                return (
                  <li key={b.match.id} className="flex h-[60px] items-center gap-3 border-b border-border last:border-b-0">
                    {winner && (
                      <span className="rounded-full" style={{ background: COLOR_HEX[winner.mp.color] }}>
                        <Avatar emoji={winner.player.emoji} size={36} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <NoWrap truncate className="text-base font-bold">
                        {requireGame(b.match.gameKey).name}
                      </NoWrap>
                      <NoWrap truncate className="text-[13px] text-text-2">
                        {resultLine(b)}
                      </NoWrap>
                    </div>
                    <NoWrap className="text-[13px] text-text-2">{relativeDay(b.match.endedAt ?? b.match.updatedAt)}</NoWrap>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      {inProgress?.length === 0 && recent?.length === 0 && (
        <EmptyState title="Ready when you are" body="Start a new game. Finished games show up here and in History." />
      )}
    </>
  );
}
