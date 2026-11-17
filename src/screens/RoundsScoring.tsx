import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton } from '../components/GameChrome';
import { PausedOverlay, PauseButton, useGameControls } from '../components/GameControls';
import { MoreIcon, RoundsIcon, UndoIcon } from '../components/Icons';
import { db } from '../db/schema';
import type { MatchBundle } from '../db/repos/matches';
import { confirmDraft, listRounds, reopenLastRound, saveDraft, updateRound } from '../db/repos/rounds';
import type { Round } from '../domain/types';
import { BlitzCard } from '../games/dutchBlitz/BlitzCard';
import { RoundEditSheet, RoundsSheet } from '../games/dutchBlitz/RoundsSheets';
import { blitzEntry, blitzInput, clampInput, totals, type BlitzInput } from '../games/dutchBlitz/scoring';
import { outcomeFor } from '../games/outcome';
import { requireGame } from '../games/registry';
import { useStandings } from '../hooks/useStandings';
import { useFlip } from '../hooks/useFlip';

/** Rounds template (FR-9 Dutch Blitz). */
export function RoundsScoring({ bundle }: { bundle: MatchBundle }) {
  const { match, seats, rounds } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const controls = useGameControls(match, { notesInMenu: true });
  const paused = match.pausedAt !== null;
  const outcome = outcomeFor(bundle);
  const [listOpen, setListOpen] = useState(false);
  const [editing, setEditing] = useState<Round | null>(null);

  const draft = rounds.find((r) => !r.confirmed);
  const confirmedCount = rounds.filter((r) => r.confirmed).length;
  const tot = totals(
    seats.map((s) => s.player.id),
    rounds,
  );
  const inputsOf = (r: Round | undefined): Record<string, BlitzInput> =>
    Object.fromEntries(seats.map((s) => [s.player.id, blitzInput(r?.entries.find((e) => e.playerId === s.player.id))]));
  // The round being entered lives here and is saved on every change (R-7). It is never reloaded
  // from database updates, which can arrive late and would overwrite newer taps; only our own
  // Confirm (start blank) and Undo (load the reopened round) replace it.
  const [inputs, setInputs] = useState(() => inputsOf(draft));
  const blank = seats.every((s) => inputs[s.player.id]!.dutch === 0 && inputs[s.player.id]!.blitz === 0);
  const change = (playerId: string, i: BlitzInput) => {
    const next = { ...inputs, [playerId]: clampInput(i) };
    setInputs(next);
    void saveDraft(db, match.id, seats.map((s) => blitzEntry(s.player.id, next[s.player.id]!)));
  };
  const targets = seats.map((s) => s.mp.target ?? game.defaultTarget ?? 0);
  const handicap = new Set(targets).size > 1;
  const standing = useStandings(
    seats.map((s, i) => ({ playerId: s.player.id, name: s.player.name, total: tot[s.player.id] ?? 0, target: targets[i]! })),
    confirmedCount,
  );
  const listRef = useFlip<HTMLDivElement>(standing.order.join());

  // Confirming the round that reaches a target goes to Results (FR-9 AC-3). Editing a past
  // round that ends the game shows the Game over banner instead of jumping away.
  const justConfirmed = useRef(false);
  useEffect(() => {
    if (outcome.complete && justConfirmed.current) navigate(`/play/${match.id}/results`);
    justConfirmed.current = false;
  }, [outcome.complete, confirmedCount, match.id, navigate]);

  async function confirm() {
    const entries = seats.map((s) => blitzEntry(s.player.id, inputs[s.player.id]!));
    // Start the next round blank at once, so a fast tap can't land on the old values.
    setInputs(inputsOf(undefined));
    justConfirmed.current = true;
    await confirmDraft(db, match.id, entries);
  }

  async function undo() {
    await reopenLastRound(db, match.id);
    const reopened = (await listRounds(db, match.id)).find((r) => !r.confirmed);
    setInputs(inputsOf(reopened));
  }

  return (
    <GameScreen>
      <GameHeader
        title={game.name}
        sub={`Round ${outcome.complete ? confirmedCount : confirmedCount + 1} · ${handicap ? 'handicaps' : `to ${targets[0]}`}`}
        onBack={controls.exitToHome}
        trailing={
          <TimerChip match={match}>
            <PauseButton match={match} />
          </TimerChip>
        }
      />
      <GameBody className="gap-2.5 px-4 pt-1 pb-4">
        <PausedOverlay match={match} />
        {outcome.complete && (
          <p className="m-0 rounded-2xl bg-surface px-3.5 py-3 text-[15px] leading-snug" role="status">
            Game over: a player reached their target. Edit a round or Undo to keep playing.
          </p>
        )}
        <div ref={listRef} className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {standing.order.map((id) => {
            const i = seats.findIndex((x) => x.player.id === id);
            const s = seats[i]!;
            return (
            <div key={s.mp.id} data-flip-key={s.player.id}>
            <BlitzCard
              leader={standing.leaders.includes(s.player.id)}
              crownPop={standing.popFor === s.player.id}
              seat={s}
              input={inputs[s.player.id]!}
              total={tot[s.player.id] ?? 0}
              target={targets[i]!}
              showTarget={handicap}
              disabled={paused || outcome.complete}
              onChange={(next) => change(s.player.id, next)}
            />
            </div>
            );
          })}
        </div>
      </GameBody>
      <BottomToolbar>
        <ToolButton
          icon={<UndoIcon />}
          label="Undo"
          disabled={paused || !blank || confirmedCount === 0}
          onClick={undo}
        />
        <ToolButton icon={<RoundsIcon />} label="Rounds" onClick={() => setListOpen(true)} />
        {outcome.complete ? (
          <PrimaryToolButton disabled={paused} onClick={() => navigate(`/play/${match.id}/results`)}>
            See results
          </PrimaryToolButton>
        ) : (
          <PrimaryToolButton
            disabled={paused || blank}
            onClick={confirm}
          >
            Confirm round
          </PrimaryToolButton>
        )}
        <ToolButton icon={<MoreIcon />} label="More" onClick={controls.openMore} />
      </BottomToolbar>
      {controls.element}
      {listOpen && !editing && (
        <RoundsSheet seats={seats} rounds={rounds} onClose={() => setListOpen(false)} onOpen={(r) => setEditing(r)} />
      )}
      {editing && (
        <RoundEditSheet
          seats={seats}
          round={editing}
          onClose={() => setEditing(null)}
          onSave={async (entries) => {
            await updateRound(db, editing.id, entries);
            setEditing(null);
          }}
        />
      )}
    </GameScreen>
  );
}
