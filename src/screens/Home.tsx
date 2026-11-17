import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PlusIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { EmptyState, ScreenHeader } from '../components/Screen';
import { db } from '../db/schema';
import { getMatchBundle, listInProgress } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import { elapsedMs, formatLength } from '../domain/timer';
import { requireGame } from '../games/registry';

export function Home() {
  const navigate = useNavigate();
  const inProgress = useLiveQuery(async () => {
    const matches = await listInProgress(db);
    return Promise.all(matches.map((m) => getMatchBundle(db, m.id)));
  }, []);

  return (
    <>
      <ScreenHeader title="Game night" />
      <div className="flex flex-col gap-3.5 px-4">
        <Button size="lg" icon={<PlusIcon />} onClick={() => navigate('/new')}>
          New game
        </Button>

        {inProgress && inProgress.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[17px] font-extrabold">In progress</h2>
            {inProgress.map((b) =>
              b ? (
                <div key={b.match.id} className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-border p-3.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <NoWrap truncate className="text-[17px] font-extrabold">
                      {requireGame(b.match.gameKey).name}
                    </NoWrap>
                    <NoWrap truncate className="text-[14px] text-text-2">
                      {formatLength(elapsedMs(b.match))}
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
              ) : null,
            )}
          </section>
        )}
      </div>
      {inProgress?.length === 0 && (
        <EmptyState title="Ready when you are" body="Start a new game. Finished games show up in History." />
      )}
    </>
  );
}
