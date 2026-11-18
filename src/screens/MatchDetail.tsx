import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { Button } from '../components/Button';
import { GameHeader, GameScreen, PrimaryToolButton } from '../components/GameChrome';
import { PencilIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { db } from '../db/schema';
import { getMatchBundle, type MatchBundle } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import { endTime } from '../domain/history';
import { ordinal } from '../domain/placement';
import { elapsedMs, formatLength } from '../domain/timer';
import { rankedSeats, seatDetail, seatValue } from '../games/display';
import { requireGame } from '../games/registry';
import { Tile } from './Results';

/** FR-13 AC-2: one finished game: players, scores, breakdown, length. */
export function MatchDetail() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null || bundle.match.status !== 'finished') {
    return (
      <GameScreen>
        <GameHeader title="Game not found" backTo="/history" />
        <div className="flex justify-center p-8">
          <Button onClick={() => navigate('/history', { replace: true })}>Back to history</Button>
        </div>
      </GameScreen>
    );
  }
  const { match } = bundle;
  const game = requireGame(match.gameKey);
  const date = new Date(endTime(bundle)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <GameScreen>
      <GameHeader title={game.name} sub={date} backTo="/history" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6">
        <DetailContent bundle={bundle} />
      </main>
      <BottomToolbar>
        <PrimaryToolButton icon={<PencilIcon />} onClick={() => navigate(`/history/${match.id}/edit`)}>
          Edit scores
        </PrimaryToolButton>
      </BottomToolbar>
    </GameScreen>
  );
}

/** The players and tiles of a finished game: the page above, and History's side pane in landscape. */
function DetailContent({ bundle }: { bundle: MatchBundle }) {
  const { match } = bundle;
  const game = requireGame(match.gameKey);
  return (
    <>
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Players">
          {rankedSeats(bundle).map((s) => (
            <li
              key={s.mp.id}
              className="flex h-14 items-center gap-2.5 rounded-[28px] pr-4 pl-2 text-white"
              style={{
                background: COLOR_HEX[s.mp.color],
                boxShadow: s.mp.color === 'black' ? 'inset 0 0 0 1.5px var(--black-outline)' : undefined,
              }}
            >
              <Avatar emoji={s.player.emoji} />
              <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
                <NoWrap truncate className="text-[17px] font-bold">
                  {s.player.name}
                </NoWrap>
                <NoWrap truncate className="text-[13px]">
                  {[
                    s.mp.placement !== null ? ordinal(s.mp.placement) : null,
                    s.mp.isWinner ? 'Winner' : null,
                    s.player.deletedAt !== null ? 'deleted profile' : null,
                    s.player.isGuest ? 'guest' : null,
                    seatDetail(bundle, s),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </NoWrap>
              </div>
              <NoWrap className="tabular text-[17px] font-extrabold">{seatValue(bundle, s)}</NoWrap>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-2">
          <Tile label="Length" value={formatLength(elapsedMs(match))} />
          {game.template === 'rounds' ? (
            <Tile label="Rounds" value={String(bundle.rounds.filter((r) => r.confirmed).length)} />
          ) : (
            <Tile label="Players" value={String(bundle.seats.length)} />
          )}
        </div>
    </>
  );
}

/** NFR-3 landscape: the detail beside the History list. */
export function MatchDetailPanel({ matchId }: { matchId: string }) {
  const navigate = useNavigate();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (!bundle || bundle.match.status !== 'finished') return null;
  const { match } = bundle;
  const game = requireGame(match.gameKey);
  const date = new Date(endTime(bundle)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <section className="flex flex-col gap-4" aria-label="Game detail">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <NoWrap as="h2" truncate className="m-0 text-[22px] leading-tight font-extrabold">
            {game.name}
          </NoWrap>
          <NoWrap truncate className="text-[14px] text-text-2">
            {date}
          </NoWrap>
        </div>
        <Button icon={<PencilIcon />} onClick={() => navigate(`/history/${match.id}/edit`)}>
          Edit scores
        </Button>
      </div>
      <DetailContent bundle={bundle} />
    </section>
  );
}
