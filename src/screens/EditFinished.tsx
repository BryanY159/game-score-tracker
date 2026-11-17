import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, ToolButton } from '../components/GameChrome';
import { CheckIcon, UndoIcon } from '../components/Icons';
import { Button } from '../components/Button';
import { db } from '../db/schema';
import { getMatchBundle, saveFinishedEdit, type MatchBundle } from '../db/repos/matches';
import type { MatchEvent } from '../domain/types';
import { ParcheesiBoard } from '../games/parcheesi/ParcheesiBoard';
import { parcheesiState } from '../games/parcheesi/scoring';
import { MonopolyBoard } from '../games/monopoly/MonopolyBoard';
import { EndEarly } from '../games/monopoly/EndEarly';
import { monopolyState } from '../games/monopoly/scoring';
import { outcomeFor } from '../games/outcome';
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
  return <PlacementEdit bundle={bundle} />;
}

function PlacementEdit({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const [log, setLog] = useState<MatchEvent[]>(match.log);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const outcome = outcomeFor(bundle, log);
  const changed = log !== match.log;
  const ids = seats.map((s) => s.player.id);
  const at = match.endedAt ?? match.updatedAt;
  const monopoly = match.gameKey === 'monopoly' ? monopolyState(ids, log) : null;

  async function save() {
    setSaving(true);
    await saveFinishedEdit(db, match.id, { log, endedEarly: outcome.endedEarly }, outcome.results);
    navigate(`/history/${match.id}`, { replace: true });
  }

  if (ending && monopoly) {
    return (
      <EndEarly
        seats={seats}
        state={monopoly}
        onCancel={() => setEnding(false)}
        onDone={(entry) => {
          setLog((l) => [...l, { ...entry, at }]);
          setEnding(false);
        }}
      />
    );
  }

  return (
    <GameScreen>
      <GameHeader title={`Edit ${requireGame(match.gameKey).name}`} sub="Changes save when you tap Save" backTo={`/history/${match.id}`} />
      <GameBody className="gap-3 px-4 pt-2 pb-4">
        {monopoly ? (
          <MonopolyBoard seats={seats} state={monopoly} onBankrupt={(playerId) => setLog((l) => [...l, { type: 'bankrupt', playerId, at }])} />
        ) : (
          <ParcheesiBoard
            seats={seats}
            state={parcheesiState(ids, log)}
            onStep={(playerId, delta) => setLog((l) => [...l, { type: 'pawns', playerId, delta, at }])}
          />
        )}
        {monopoly && !outcome.complete && monopoly.remaining.length > 1 && (
          <Button variant="outline" onClick={() => setEnding(true)}>
            End early by net worth
          </Button>
        )}
        <p className="m-0 rounded-2xl border-[1.5px] border-border px-3.5 py-3 text-[14px] leading-snug text-text-2">
          Undo steps back through the game's entries to reopen places. Save needs the game to be complete again.
        </p>
      </GameBody>
      <BottomToolbar>
        <ToolButton icon={<UndoIcon />} label="Undo" disabled={log.length === 0} onClick={() => setLog((l) => l.slice(0, -1))} />
        <PrimaryToolButton icon={<CheckIcon />} disabled={!changed || !outcome.complete || saving} onClick={save}>
          Save
        </PrimaryToolButton>
      </BottomToolbar>
    </GameScreen>
  );
}
