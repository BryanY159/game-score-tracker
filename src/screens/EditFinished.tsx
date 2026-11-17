import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, ToolButton } from '../components/GameChrome';
import { CheckIcon, UndoIcon } from '../components/Icons';
import { Button } from '../components/Button';
import { db } from '../db/schema';
import { getMatchBundle, saveFinishedEdit, type MatchBundle } from '../db/repos/matches';
import type { MatchEvent, Round } from '../domain/types';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { TieScreen } from '../components/TieScreen';
import { COLOR_HEX } from '../domain/colors';
import { RoundEditSheet, RoundsList } from '../games/dutchBlitz/RoundsSheets';
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
  if (requireGame(bundle.match.gameKey).template === 'rounds') return <RoundsEdit bundle={bundle} />;
  return <PlacementEdit bundle={bundle} />;
}

/** Rounds games: open any round, change it, Save. A new tie for first asks for a decision first. */
function RoundsEdit({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<Round[]>(bundle.rounds.filter((r) => r.confirmed));
  const [log, setLog] = useState<MatchEvent[]>(match.log);
  const [editing, setEditing] = useState<Round | null>(null);
  const [tieOpen, setTieOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const outcome = outcomeFor(bundle, log, rounds);
  const changed = rounds.some((r, i) => r !== bundle.rounds.filter((x) => x.confirmed)[i]) || log !== match.log;

  async function save() {
    if (outcome.tie.length) return setTieOpen(true);
    setSaving(true);
    await saveFinishedEdit(db, match.id, { log }, outcome.results, undefined, rounds);
    navigate(`/history/${match.id}`, { replace: true });
  }

  return (
    <GameScreen>
      <GameHeader title={`Edit ${requireGame(match.gameKey).name}`} sub="Tap a round to change it" backTo={`/history/${match.id}`} />
      <GameBody className="gap-3 px-4 pt-2 pb-4">
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Totals">
          {outcome.rows.map((r) => (
            <li key={r.seat.mp.id} className="flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-white" style={{ background: COLOR_HEX[r.seat.mp.color] }}>
              <Avatar emoji={r.seat.player.emoji} size={36} />
              <NoWrap truncate className="flex-1 text-base font-bold">
                {r.seat.player.name}
              </NoWrap>
              <NoWrap className="tabular text-[14px]">{r.detail}</NoWrap>
              <NoWrap className="tabular text-xl font-extrabold">{r.value}</NoWrap>
            </li>
          ))}
        </ul>
        <RoundsList seats={seats} rounds={rounds} onOpen={setEditing} />
        {!outcome.complete && (
          <p role="alert" className="m-0 text-[14px] font-bold">
            With these rounds nobody reaches their target, so the game wouldn't be over. Change a round to save.
          </p>
        )}
      </GameBody>
      <BottomToolbar>
        <PrimaryToolButton icon={<CheckIcon />} disabled={!changed || !outcome.complete || saving} onClick={save}>
          Save
        </PrimaryToolButton>
      </BottomToolbar>
      {editing && (
        <RoundEditSheet
          seats={seats}
          round={editing}
          onClose={() => setEditing(null)}
          onSave={(entries) => {
            setRounds((rs) => rs.map((r) => (r.id === editing.id ? { ...r, entries } : r)));
            setEditing(null);
          }}
        />
      )}
      {tieOpen && (
        <TieScreen
          tied={outcome.tie}
          reason="are tied on margin past target and on total."
          onClose={() => setTieOpen(false)}
          onDecide={(d) => {
            setLog((l) => [
              ...l,
              {
                type: 'tieDecision',
                decision: d.kind === 'shared' ? { kind: 'shared', playerIds: outcome.tie.map((s) => s.player.id) } : d,
                rounds: outcome.roundCount,
                at: match.endedAt ?? match.updatedAt,
              },
            ]);
            setTieOpen(false);
          }}
        />
      )}
    </GameScreen>
  );
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
