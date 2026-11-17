import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { Button } from '../components/Button';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton } from '../components/GameChrome';
import { PausedOverlay, PauseButton, useGameControls } from '../components/GameControls';
import { MoreIcon, NotesIcon, UndoIcon } from '../components/Icons';
import { db } from '../db/schema';
import { appendEvent, getMatchBundle, undoLastEvent, type MatchBundle } from '../db/repos/matches';
import { ParcheesiBoard } from '../games/parcheesi/ParcheesiBoard';
import { parcheesiState } from '../games/parcheesi/scoring';
import { MonopolyBoard } from '../games/monopoly/MonopolyBoard';
import { EndEarly } from '../games/monopoly/EndEarly';
import { monopolyState } from '../games/monopoly/scoring';
import { outcomeFor } from '../games/outcome';
import { requireGame } from '../games/registry';
import { RoundsScoring } from './RoundsScoring';
import { Flip7Scoring } from './Flip7Scoring';

/** Loads a game and routes to the right scoring screen. */
export function PlayMatch() {
  const { matchId = '' } = useParams();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null) return <Gone />;
  if (bundle.match.status !== 'inProgress') return <Gone />;
  if (bundle.match.gameKey === 'flip7') return <Flip7Scoring bundle={bundle} />;
  if (requireGame(bundle.match.gameKey).template === 'rounds') return <RoundsScoring bundle={bundle} />;
  return <PlacementScoring bundle={bundle} />;
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

/** Placement template (FR-6 Parcheesi, FR-10 Monopoly). */
function PlacementScoring({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const controls = useGameControls(match);
  const paused = match.pausedAt !== null;
  const outcome = outcomeFor(bundle);
  const [ending, setEnding] = useState(false);
  const ids = seats.map((s) => s.player.id);
  const monopoly = match.gameKey === 'monopoly' ? monopolyState(ids, match.log) : null;

  // When the last place is decided by a tap here, go straight to Results (FR-6 AC-3, FR-10 AC-2).
  const wasComplete = useRef(outcome.complete);
  useEffect(() => {
    if (outcome.complete && !wasComplete.current) navigate(`/play/${match.id}/results`);
    wasComplete.current = outcome.complete;
  }, [outcome.complete, match.id, navigate]);

  if (ending && monopoly) {
    return (
      <EndEarly
        seats={seats}
        state={monopoly}
        onCancel={() => setEnding(false)}
        onDone={async (entry) => {
          await appendEvent(db, match.id, entry);
          setEnding(false);
        }}
      />
    );
  }

  return (
    <GameScreen>
      <GameHeader
        title={game.name}
        sub={monopoly ? `${monopoly.remaining.length} still playing` : 'Pawns home'}
        onBack={controls.exitToHome}
        trailing={
          <TimerChip match={match}>
            <PauseButton match={match} />
          </TimerChip>
        }
      />
      <GameBody className="gap-3 px-4 pt-2 pb-4">
        <PausedOverlay match={match} />
        {monopoly ? (
          <MonopolyBoard
            seats={seats}
            state={monopoly}
            disabled={paused}
            onBankrupt={(playerId) => appendEvent(db, match.id, { type: 'bankrupt', playerId })}
          />
        ) : (
          <ParcheesiBoard
            seats={seats}
            state={parcheesiState(ids, match.log)}
            disabled={paused}
            onPawns={(playerId, delta) => appendEvent(db, match.id, { type: 'pawns', playerId, delta })}
            onTripleDoublets={(playerId, delta) => appendEvent(db, match.id, { type: 'tripleDoublets', playerId, delta })}
          />
        )}
        <p className="m-0 rounded-2xl border-[1.5px] border-border px-3.5 py-3 text-[14px] leading-snug text-text-2">
          {monopoly
            ? 'Tap Bankrupt when a player is out. The last player left wins. End game ranks everyone left by net worth.'
            : 'When a 4th pawn gets home, that player gets the next place. The last player left is placed automatically.'}
        </p>
      </GameBody>
      <BottomToolbar>
        <ToolButton icon={<UndoIcon />} label="Undo" disabled={match.log.length === 0 || paused} onClick={() => undoLastEvent(db, match.id)} />
        <ToolButton icon={<NotesIcon />} label="Notes" onClick={controls.openNotes} />
        {monopoly && !outcome.complete ? (
          <PrimaryToolButton disabled={paused || monopoly.remaining.length < 2} onClick={() => setEnding(true)}>
            End game
          </PrimaryToolButton>
        ) : (
          <PrimaryToolButton disabled={!outcome.complete || paused} onClick={() => navigate(`/play/${match.id}/results`)}>
            See results
          </PrimaryToolButton>
        )}
        <ToolButton icon={<MoreIcon />} label="More" onClick={controls.openMore} />
      </BottomToolbar>
      {controls.element}
    </GameScreen>
  );
}
