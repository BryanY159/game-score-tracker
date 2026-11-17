import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { Button } from '../components/Button';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton } from '../components/GameChrome';
import { PausedOverlay, PauseButton, useGameControls } from '../components/GameControls';
import { MoreIcon, NotesIcon, UndoIcon } from '../components/Icons';
import { ParcheesiBoard } from '../games/parcheesi/ParcheesiBoard';
import { db } from '../db/schema';
import { appendEvent, getMatchBundle, undoLastEvent, type MatchBundle } from '../db/repos/matches';
import { requireGame } from '../games/registry';
import { parcheesiState } from '../games/parcheesi/scoring';

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
  const controls = useGameControls(match);
  const paused = match.pausedAt !== null;

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
      <GameHeader
        title={game.name}
        sub="Pawns home"
        onBack={controls.exitToHome}
        trailing={
          <TimerChip match={match}>
            <PauseButton match={match} />
          </TimerChip>
        }
      />
      <GameBody className="gap-3 px-4 pt-2 pb-4">
        <PausedOverlay match={match} />
        <ParcheesiBoard seats={seats} state={state} onStep={step} disabled={paused} />
        <p className="m-0 rounded-2xl border-[1.5px] border-border px-3.5 py-3 text-[14px] leading-snug text-text-2">
          When a 4th pawn gets home, that player gets the next place. The last player left is placed automatically.
        </p>
      </GameBody>
      <BottomToolbar>
        <ToolButton
          icon={<UndoIcon />}
          label="Undo"
          disabled={match.log.length === 0 || paused}
          onClick={() => undoLastEvent(db, match.id)}
        />
        <ToolButton icon={<NotesIcon />} label="Notes" onClick={controls.openNotes} />
        <PrimaryToolButton disabled={!state.complete || paused} onClick={() => navigate(`/play/${match.id}/results`)}>
          See results
        </PrimaryToolButton>
        <ToolButton icon={<MoreIcon />} label="More" onClick={controls.openMore} />
      </BottomToolbar>
      {controls.element}

    </GameScreen>
  );
}
