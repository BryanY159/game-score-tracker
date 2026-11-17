import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton } from '../components/GameChrome';
import { MinusIcon, MoreIcon, PlusIcon, UndoIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { Sheet } from '../components/Sheet';
import { db } from '../db/schema';
import { appendEvent, cancelMatch, getMatchBundle, undoLastEvent, type MatchBundle } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import { ordinal } from '../domain/placement';
import { requireGame } from '../games/registry';
import { canStep, PAWNS, parcheesiState } from '../games/parcheesi/scoring';

/** Loads a game and routes to the right scoring screen. */
export function PlayMatch() {
  const { matchId = '' } = useParams();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null) return <Gone />;
  if (bundle.match.status !== 'inProgress') return <Gone />;
  return <ParcheesiScoring bundle={bundle} />;
}

export function Gone() {
  const navigate = useNavigate();
  return (
    <GameScreen>
      <GameHeader title="Game not found" />
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="m-0 text-[15px] text-text-2">This game was cancelled or has already been finalized.</p>
        <Button onClick={() => navigate('/', { replace: true })}>Go home</Button>
      </div>
    </GameScreen>
  );
}

/** FR-6: Parcheesi on the Placement template. */
function ParcheesiScoring({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const state = parcheesiState(
    seats.map((s) => s.player.id),
    match.log,
  );
  const [more, setMore] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // When the last place is decided by a tap here, go straight to Results (FR-6 AC-3).
  const wasComplete = useRef(state.complete);
  useEffect(() => {
    if (state.complete && !wasComplete.current) navigate(`/play/${match.id}/results`);
    wasComplete.current = state.complete;
  }, [state.complete, match.id, navigate]);

  const step = (playerId: string, delta: 1 | -1) =>
    appendEvent(db, match.id, { type: 'pawns', playerId, delta });

  return (
    <GameScreen>
      <GameHeader title={game.name} sub="Pawns home" trailing={<TimerChip match={match} />} />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-4">
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
          {seats.map(({ player, mp }) => {
            const p = state.players.find((x) => x.playerId === player.id)!;
            const placed = p.placement !== null;
            return (
              <li
                key={mp.id}
                className="flex min-h-[68px] items-center gap-2.5 rounded-[28px] py-3 pr-2 pl-2 text-white"
                style={{ background: COLOR_HEX[mp.color] }}
              >
                <Avatar emoji={player.emoji} size={44} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <NoWrap truncate className="text-lg font-extrabold">
                    {player.name}
                  </NoWrap>
                  {placed && p.pawnsHome === PAWNS ? (
                    <NoWrap truncate className="text-[13px]">
                      All 4 pawns home
                    </NoWrap>
                  ) : (
                    <PawnDots n={p.pawnsHome} />
                  )}
                </div>
                {placed ? (
                  <NoWrap className="tabular flex h-10 items-center rounded-[20px] bg-white px-4 text-lg font-extrabold text-[#1F2430]">
                    {ordinal(p.placement!)}
                  </NoWrap>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Remove a pawn from home for ${player.name}`}
                      disabled={!canStep(state, player.id, -1)}
                      onClick={() => step(player.id, -1)}
                      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-white disabled:opacity-35"
                    >
                      <MinusIcon width={20} height={20} />
                    </button>
                    <span className="tabular w-7 text-center text-[26px] font-extrabold" aria-label={`${p.pawnsHome} pawns home`}>
                      {p.pawnsHome}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add a pawn home for ${player.name}`}
                      disabled={!canStep(state, player.id, 1)}
                      onClick={() => step(player.id, 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white disabled:opacity-35"
                      style={{ color: COLOR_HEX[mp.color] }}
                    >
                      <PlusIcon width={20} height={20} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="m-0 rounded-2xl border-[1.5px] border-border px-3.5 py-3 text-[14px] leading-snug text-text-2">
          When a 4th pawn gets home, that player gets the next place. The last player left is placed automatically.
        </p>
      </main>
      <BottomToolbar>
        <ToolButton icon={<UndoIcon />} label="Undo" disabled={match.log.length === 0} onClick={() => undoLastEvent(db, match.id)} />
        <PrimaryToolButton disabled={!state.complete} onClick={() => navigate(`/play/${match.id}/results`)}>
          See results
        </PrimaryToolButton>
        <ToolButton icon={<MoreIcon />} label="More" onClick={() => setMore(true)} />
      </BottomToolbar>

      {more && (
        <Sheet title="Game options" onClose={() => setMore(false)}>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setConfirmCancel(true)}>
              Cancel game
            </Button>
          </div>
        </Sheet>
      )}
      {confirmCancel && (
        <ConfirmDialog
          title="Cancel this game?"
          body="It will be discarded and won't appear in history."
          confirmLabel="Discard"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={async () => {
            await cancelMatch(db, match.id);
            navigate('/', { replace: true });
          }}
        />
      )}
    </GameScreen>
  );
}

function PawnDots({ n }: { n: number }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${n} of ${PAWNS} pawns home`}>
      {Array.from({ length: PAWNS }, (_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full ${i < n ? 'bg-white' : 'border-2 border-white'}`} />
      ))}
    </div>
  );
}
