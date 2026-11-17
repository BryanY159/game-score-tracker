import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { Button } from '../components/Button';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton } from '../components/GameChrome';
import { PausedOverlay, PauseButton, useGameControls } from '../components/GameControls';
import { MoreIcon, RoundsIcon, UndoIcon } from '../components/Icons';
import { Keypad } from '../components/Keypad';
import { NoWrap } from '../components/NoWrap';
import { Segmented } from '../components/Segmented';
import { db } from '../db/schema';
import { updateMatchSettings, type MatchBundle } from '../db/repos/matches';
import { confirmDraft, listRounds, reopenLastRound, saveDraft, updateRound } from '../db/repos/rounds';
import type { Round } from '../domain/types';
import { CardsPad } from '../games/flip7/CardsPad';
import { Flip7Row } from '../games/flip7/Flip7Row';
import { blankRaw, dealerFor, flip7Entry, flip7Score, isEntered, rawOf, tapNumber, type EntryMode, type Flip7Raw } from '../games/flip7/scoring';
import { RoundEditor } from '../games/RoundEditor';
import { RoundsSheet } from '../games/dutchBlitz/RoundsSheets';
import { outcomeFor } from '../games/outcome';
import { roundTotals } from '../games/rounds';
import { requireGame } from '../games/registry';

/** FR-8 Flip 7 on the rounds template, with the custom keypad (FR-18 AC-2). */
export function Flip7Scoring({ bundle }: { bundle: MatchBundle }) {
  const { match, seats, rounds } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const controls = useGameControls(match, { notesInMenu: true });
  const paused = match.pausedAt !== null;
  const outcome = outcomeFor(bundle);
  const mode = (match.settings.entryMode as EntryMode | undefined) ?? 'number';
  const ids = seats.map((s) => s.player.id);
  const confirmedCount = rounds.filter((r) => r.confirmed).length;
  const roundNumber = confirmedCount + 1;
  const dealerId = dealerFor(roundNumber, ids);
  const draft = rounds.find((r) => !r.confirmed);
  const totals = roundTotals(ids, rounds);
  const targets = seats.map((s) => s.mp.target ?? game.defaultTarget ?? 0);
  const handicap = new Set(targets).size > 1;

  const rawsOf = (r: Round | undefined) => Object.fromEntries(ids.map((id) => [id, rawOf(r?.entries.find((e) => e.playerId === id), mode)]));
  // The round being entered lives here and is saved on every change (R-7); never reloaded from late
  // database updates (see M7). Only Confirm and Undo replace it.
  const [raws, setRaws] = useState<Record<string, Flip7Raw>>(() => rawsOf(draft));
  const [active, setActive] = useState<string>(() => ids.find((id) => !isEntered(rawsOf(draft)[id]!)) ?? ids[0]!);
  const [bustAsk, setBustAsk] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [editing, setEditing] = useState<Round | null>(null);
  const allEntered = ids.every((id) => isEntered(raws[id]!));
  const blank = ids.every((id) => !isEntered(raws[id]!));
  const over = outcome.complete;

  function set(playerId: string, raw: Flip7Raw) {
    const next = { ...raws, [playerId]: raw };
    setRaws(next);
    void saveDraft(
      db,
      match.id,
      ids.map((id) => flip7Entry(id, next[id]!)),
      dealerId,
    );
  }
  function nextPlayer() {
    const i = ids.indexOf(active);
    const order = [...ids.slice(i + 1), ...ids.slice(0, i + 1)];
    setActive(order.find((id) => !isEntered(raws[id]!) && id !== active) ?? ids[(i + 1) % ids.length]!);
  }

  // Keep the player being entered in view (8 players on a small iPhone, R-2).
  useEffect(() => {
    document.getElementById(`flip7-row-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const justConfirmed = useRef(false);
  useEffect(() => {
    if (outcome.complete && justConfirmed.current) navigate(`/play/${match.id}/results`);
    justConfirmed.current = false;
  }, [outcome.complete, confirmedCount, match.id, navigate]);

  async function confirm() {
    const entries = ids.map((id) => flip7Entry(id, raws[id]!));
    setRaws(rawsOf(undefined));
    setActive(ids[0]!);
    justConfirmed.current = true;
    await confirmDraft(db, match.id, entries);
  }
  async function undo() {
    await reopenLastRound(db, match.id);
    const reopened = (await listRounds(db, match.id)).find((r) => !r.confirmed);
    setRaws(rawsOf(reopened));
  }

  const raw = raws[active]!;
  const modeSwitch = (
    <div className="w-[150px] shrink-0">
      <Segmented
        label="Entry mode"
        value={mode}
        onChange={(m) => updateMatchSettings(db, match.id, { entryMode: m })}
        options={[
          { value: 'number', label: 'Number' },
          { value: 'cards', label: 'Cards' },
        ]}
      />
    </div>
  );
  const activeName = seats.find((s) => s.player.id === active)!.player.name;
  const padRaw = raw.mode === mode ? raw : blankRaw(mode);

  return (
    <GameScreen>
      <GameHeader
        title={game.name}
        sub={`Round ${over ? confirmedCount : roundNumber} · Dealer: ${seats.find((s) => s.player.id === dealerId)!.player.name}`}
        onBack={controls.exitToHome}
        trailing={
          <TimerChip match={match}>
            <PauseButton match={match} />
          </TimerChip>
        }
      />
      <GameBody className="gap-2 px-4 pt-1 pb-3">
        <PausedOverlay match={match} />
        {outcome.extraRound && (
          <p className="m-0 rounded-2xl bg-surface px-3.5 py-3 text-[15px] leading-snug font-bold" role="status">
            Tie-break round: everyone plays one more round.
          </p>
        )}
        {over && (
          <p className="m-0 rounded-2xl bg-surface px-3.5 py-3 text-[15px] leading-snug" role="status">
            Game over: a player reached their target. Edit a round or Undo to keep playing.
          </p>
        )}
        <div className="flex justify-between px-2 text-[13px] text-text-2">
          <NoWrap>Player{handicap ? ' · target' : ''}</NoWrap>
          <NoWrap>This round · Total</NoWrap>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {seats.map((s, i) => (
            <div key={s.mp.id} id={`flip7-row-${s.player.id}`}>
              <Flip7Row
                seat={s}
                raw={raws[s.player.id]!}
                total={totals[s.player.id] ?? 0}
                target={targets[i]!}
                showTarget={handicap}
                dealer={s.player.id === dealerId}
                active={!over && s.player.id === active}
                compact={seats.length > 5}
                disabled={paused || over}
                onSelect={() => setActive(s.player.id)}
              />
            </div>
          ))}
        </div>
      </GameBody>

      <div className="pb-safe sticky bottom-0 z-10 bg-bg">
        {!over && !paused && (
          <div className="border-t border-border px-3 pt-1.5 pb-1">
            <div className="mx-auto flex max-w-lg flex-col gap-1.5">
              {padRaw.mode === 'number' ? (
                <Keypad
                  label={activeName}
                  value={padRaw.value}
                  maxDigits={3}
                  onChange={(v) => set(active, { ...padRaw, value: v, bust: false })}
                  sideKeys={[
                    { label: 'Bust', pressed: padRaw.bust, onPress: () => (set(active, { mode: 'number', value: null, bust: true, flip7: false }), nextPlayer()) },
                    { label: 'Flip 7!', pressed: padRaw.flip7, onPress: () => set(active, { ...padRaw, flip7: !padRaw.flip7, bust: false }) },
                  ]}
                  next={{ label: 'Next player', onPress: nextPlayer }}
                  bare
                  headerExtra={modeSwitch}
                />
              ) : (
                <>
                <div className="flex items-center gap-2">
                  <NoWrap truncate className="min-w-0 flex-1 text-[15px] font-bold">
                    {activeName} · {flip7Score(padRaw)}
                  </NoWrap>
                  {modeSwitch}
                </div>
                <CardsPad
                  raw={padRaw}
                  onChange={(r) => set(active, r)}
                  onNumber={(n) => {
                    const t = tapNumber(padRaw, n);
                    if (t.kind === 'added') set(active, t.raw);
                    else if (t.kind === 'duplicate') setBustAsk(n);
                  }}
                  onBust={() => set(active, { ...padRaw, bust: !padRaw.bust })}
                  next={{ label: 'Next player', onPress: nextPlayer }}
                />
                </>
              )}
            </div>
          </div>
        )}
        <BottomToolbar>
          <ToolButton icon={<UndoIcon />} label="Undo" disabled={paused || !blank || confirmedCount === 0} onClick={undo} />
          <ToolButton icon={<RoundsIcon />} label="Rounds" onClick={() => setListOpen(true)} />
          {over ? (
            <PrimaryToolButton disabled={paused} onClick={() => navigate(`/play/${match.id}/results`)}>
              See results
            </PrimaryToolButton>
          ) : (
            <PrimaryToolButton disabled={paused || !allEntered} onClick={confirm}>
              Confirm round
            </PrimaryToolButton>
          )}
          <ToolButton icon={<MoreIcon />} label="More" onClick={controls.openMore} />
        </BottomToolbar>
      </div>

      {controls.element}
      {bustAsk !== null && padRaw.mode === 'cards' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setBustAsk(null)}>
          <div role="alertdialog" aria-modal="true" aria-label="Bust?" className="flex w-full max-w-sm flex-col gap-3 rounded-[24px] bg-bg p-5 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
            <h2 className="m-0 text-xl font-extrabold">Bust?</h2>
            <p className="m-0 text-[15px] leading-snug text-text-2">
              {activeName} already has a {bustAsk}. A second one is a bust, unless a Second Chance card saved it.
            </p>
            <Button
              onClick={() => {
                set(active, { ...padRaw, bust: true });
                setBustAsk(null);
                nextPlayer();
              }}
            >
              Bust
            </Button>
            <Button variant="outline" onClick={() => setBustAsk(null)}>
              Not a bust, remove card
            </Button>
          </div>
        </div>
      )}
      {listOpen && !editing && <RoundsSheet seats={seats} rounds={rounds} onClose={() => setListOpen(false)} onOpen={(r) => setEditing(r)} />}
      {editing && (
        <RoundEditor
          gameKey={match.gameKey}
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
