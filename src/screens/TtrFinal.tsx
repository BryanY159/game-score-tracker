import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameHeader, GameScreen, PrimaryToolButton, ToolButton } from '../components/GameChrome';
import { BackIcon } from '../components/Icons';
import { db } from '../db/schema';
import { getMatchBundle, updateSeatDetails, type MatchBundle } from '../db/repos/matches';
import { FinalForm } from '../games/ticketToRide/FinalForm';
import { ttrState, type TtrFinal } from '../games/ticketToRide/scoring';
import { ttrFinals } from '../games/outcome';
import { Gone } from './PlacementScoring';

export function TtrFinalScreen() {
  const { matchId = '' } = useParams();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null || bundle.match.status !== 'inProgress') return <Gone />;
  if (!ttrState(bundle.seats.map((s) => s.player.id), bundle.turns).playComplete) return <Navigate to={`/play/${matchId}`} replace />;
  return <Final bundle={bundle} />;
}

/** FR-7 AC-6, AC-7: end-of-game scoring, one player at a time (mockup EndGame.dc.html). */
function Final({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  // Held here and saved on every change (R-7); never reloaded from late database updates (see M7).
  const [finals, setFinals] = useState<Record<string, TtrFinal>>(() => Object.fromEntries(ttrFinals(bundle).map((x) => [x.playerId, x.final])));
  const [playerId, setPlayerId] = useState(seats[0]!.player.id);
  const i = seats.findIndex((s) => s.player.id === playerId);
  const next = seats[i + 1];

  function change(id: string, f: TtrFinal) {
    setFinals((x) => ({ ...x, [id]: f }));
    const mp = seats.find((s) => s.player.id === id)!.mp;
    void updateSeatDetails(db, mp.id, { tickets: f.tickets, longestPath: f.longestPath });
  }

  return (
    <GameScreen>
      <GameHeader title="Final scoring" sub="Tickets and longest path" backTo={`/play/${match.id}`} />
      <main className="flex-1 px-4 pb-6">
        <FinalForm seats={seats} finals={finals} playerId={playerId} onSelect={setPlayerId} onChange={change} />
      </main>
      <BottomToolbar>
        <ToolButton icon={<BackIcon />} label="Back to game" onClick={() => navigate(`/play/${match.id}`)} />
        {next ? (
          <PrimaryToolButton userText onClick={() => setPlayerId(next.player.id)}>
            Next: {next.player.name}
          </PrimaryToolButton>
        ) : (
          <PrimaryToolButton onClick={() => navigate(`/play/${match.id}/results`)}>See results</PrimaryToolButton>
        )}
      </BottomToolbar>
    </GameScreen>
  );
}
