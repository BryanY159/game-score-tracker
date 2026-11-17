import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, ToolButton } from '../components/GameChrome';
import { CheckIcon, UndoIcon } from '../components/Icons';
import { db } from '../db/schema';
import { getMatchBundle, saveFinishedEdit, type MatchBundle } from '../db/repos/matches';
import type { MatchEvent } from '../domain/types';
import { ParcheesiBoard } from '../games/parcheesi/ParcheesiBoard';
import { parcheesiResults, parcheesiState } from '../games/parcheesi/scoring';
import { requireGame } from '../games/registry';

/**
 * FR-12 AC-2: edit a finished game in place. Changes are a draft until Save;
 * the game stays finished and keeps its length.
 */
export function EditFinished() {
  const { matchId = '' } = useParams();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null || bundle.match.status !== 'finished') return <Navigate to="/history" replace />;
  return <ParcheesiEdit bundle={bundle} />;
}

function ParcheesiEdit({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const [log, setLog] = useState<MatchEvent[]>(match.log);
  const [saving, setSaving] = useState(false);
  const state = parcheesiState(
    seats.map((s) => s.player.id),
    log,
  );
  const changed = log !== match.log;

  async function save() {
    setSaving(true);
    const results = parcheesiResults(
      seats.map((s) => ({ matchPlayerId: s.mp.id, playerId: s.player.id })),
      log,
    );
    await saveFinishedEdit(db, match.id, { log }, results);
    navigate(`/history/${match.id}`, { replace: true });
  }

  return (
    <GameScreen>
      <GameHeader title={`Edit ${requireGame(match.gameKey).name}`} sub="Changes save when you tap Save" backTo={`/history/${match.id}`} />
      <GameBody className="gap-3 px-4 pt-2 pb-4">
        <ParcheesiBoard
          seats={seats}
          state={state}
          onStep={(playerId, delta) => setLog((l) => [...l, { type: 'pawns', playerId, delta, at: match.endedAt ?? match.updatedAt }])}
        />
        <p className="m-0 rounded-2xl border-[1.5px] border-border px-3.5 py-3 text-[14px] leading-snug text-text-2">
          Undo steps back through the game's entries to reopen a finishing place. Save needs a complete finishing order.
        </p>
      </GameBody>
      <BottomToolbar>
        <ToolButton icon={<UndoIcon />} label="Undo" disabled={log.length === 0} onClick={() => setLog((l) => l.slice(0, -1))} />
        <PrimaryToolButton icon={<CheckIcon />} disabled={!changed || !state.complete || saving} onClick={save}>
          Save
        </PrimaryToolButton>
      </BottomToolbar>
    </GameScreen>
  );
}
