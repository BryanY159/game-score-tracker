import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton, TwoPaneGame } from '../components/GameChrome';
import { useLandscape } from '../hooks/useLandscape';
import { PausedOverlay, PauseButton, useGameControls, useGameShortcuts } from '../components/GameControls';
import { CancelIcon, RoundsIcon, UndoIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { db } from '../db/schema';
import type { MatchBundle } from '../db/repos/matches';
import { confirmDraft, listRounds, reopenLastRound, saveDraft, updateRound } from '../db/repos/rounds';
import type { Round } from '../domain/types';
import { EntryPanel, type Panel } from '../games/flip7/EntryPanel';
import { Flip7Row } from '../games/flip7/Flip7Row';
import { blankRaw, flip7Entry, hasFlip7, isEntered, rawOf, type EntryMode, type Flip7Raw } from '../games/flip7/scoring';
import { useCelebrate } from '../components/Celebration';
import { useStandings } from '../hooks/useStandings';
import { useFlip } from '../hooks/useFlip';
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
  const controls = useGameControls(match);
  const paused = match.pausedAt !== null;
  const outcome = outcomeFor(bundle);
  // Saved games may carry an old `entryMode` setting; it's ignored now (FR-8 AC-9).
  const mode: EntryMode = 'cards';
  const ids = seats.map((s) => s.player.id);
  const confirmedCount = rounds.filter((r) => r.confirmed).length;
  const roundNumber = confirmedCount + 1;
  const draft = rounds.find((r) => !r.confirmed);
  const totals = roundTotals(ids, rounds);
  const targets = seats.map((s) => s.mp.target ?? game.defaultTarget ?? 0);
  const handicap = new Set(targets).size > 1;

  const rawsOf = (r: Round | undefined) => Object.fromEntries(ids.map((id) => [id, rawOf(r?.entries.find((e) => e.playerId === id), mode)]));
  // The round being entered lives here and is saved on every change (R-7); never reloaded from late
  // database updates (see M7). Only Confirm and Undo replace it.
  const [raws, setRaws] = useState<Record<string, Flip7Raw>>(() => rawsOf(draft));
  const [active, setActive] = useState<string>(() => ids.find((id) => !isEntered(rawsOf(draft)[id]!)) ?? ids[0]!);
  const [panel, setPanel] = useState<Panel>('cards');
  const [listOpen, setListOpen] = useState(false);
  const [editing, setEditing] = useState<Round | null>(null);
  const allEntered = ids.every((id) => isEntered(raws[id]!));
  const blank = ids.every((id) => !isEntered(raws[id]!));
  const over = outcome.complete;

  const celebrate = useCelebrate();
  const standing = useStandings(
    seats.map((s, i) => ({ playerId: s.player.id, name: s.player.name, total: totals[s.player.id] ?? 0, target: targets[i]! })),
    confirmedCount,
  );
  const listRef = useFlip<HTMLDivElement>(standing.order.join());

  function set(playerId: string, raw: Flip7Raw) {
    // A Flip 7 gets a mini celebration (FR-19 AC-2).
    if (hasFlip7(raw) && !hasFlip7(raws[playerId]!)) celebrate('flip7', seats.find((s) => s.player.id === playerId)!.player.name);
    const next = { ...raws, [playerId]: raw };
    setRaws(next);
    void saveDraft(
      db,
      match.id,
      ids.map((id) => flip7Entry(id, next[id]!)),
      null, // no dealer in Flip 7 (removed 2026-11-18); old rounds keep theirs, unused
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

  useGameShortcuts(game.name, match, { back: controls.exitToHome, undo: { run: undo, enabled: blank && confirmedCount > 0 } });

  const raw = raws[active]!;
  const activeName = seats.find((s) => s.player.id === active)!.player.name;
  const bustNow = () => {
    set(active, raw.mode === 'number' || panel === 'keypad' ? { mode: 'number', value: null, bust: true, flip7: false } : { ...raw, bust: true });
    nextPlayer();
  };
  // Each panel shows the entry made with it; switching panels starts that way of entering afresh.
  const shown: Flip7Raw =
    panel === 'keypad'
      ? raw.mode === 'number'
        ? raw
        : { ...blankRaw('number'), bust: raw.bust } as Flip7Raw
      : raw.mode === 'cards'
        ? raw
        : { ...blankRaw('cards'), bust: raw.bust } as Flip7Raw;

  const land = useLandscape();
  const header = (
    <GameHeader
      title={game.name}
      sub={`Round ${over ? confirmedCount : roundNumber}`}
      onBack={controls.exitToHome}
      trailing={
        <TimerChip match={match}>
          <PauseButton match={match} />
        </TimerChip>
      }
    />
  );
  const banners = (
    <>
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
        <NoWrap>Tap a round score to type it</NoWrap>
        <NoWrap>Round · Total</NoWrap>
      </div>
    </>
  );
  const rows = (
    <div ref={listRef} className={`grid grid-cols-1 gap-2 ${land ? '' : 'md:grid-cols-2'}`}>
      {standing.order.map((id) => {
        const i = ids.indexOf(id);
        const s = seats[i]!;
        return (
          <div key={s.mp.id} id={`flip7-row-${s.player.id}`} data-flip-key={s.player.id} className={land ? '' : 'scroll-mt-24 scroll-mb-[400px]'}>
            <Flip7Row
              leader={standing.leaders.includes(s.player.id)}
              crownPop={standing.popFor === s.player.id}
              seat={s}
              raw={raws[s.player.id]!}
              total={totals[s.player.id] ?? 0}
              target={targets[i]!}
              showTarget={handicap}
              active={!over && s.player.id === active}
              typing={!over && s.player.id === active && panel === 'keypad'}
              onType={() => {
                setActive(s.player.id);
                setPanel('keypad');
              }}
              compact={seats.length > 5}
              disabled={paused || over}
              onSelect={() => {
                setActive(s.player.id);
                setPanel('cards');
              }}
            />
          </div>
        );
      })}
    </div>
  );
  const entry = !over && !paused && (
    <EntryPanel
      name={activeName}
      raw={shown}
      note={raw.mode === 'number' && raw.value !== null ? `Typed ${raw.value}${raw.flip7 ? ' + 15' : ''}` : undefined}
      panel={panel}
      onPanel={setPanel}
      onChange={(r) => set(active, r)}
      onBust={bustNow}
      onNext={nextPlayer}
      onEnter={() => (allEntered ? void confirm() : nextPlayer())}
    />
  );
  const toolbar = (
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
      <ToolButton icon={<CancelIcon />} label="Cancel" onClick={controls.openCancel} />
    </BottomToolbar>
  );
  const sheets = (
    <>
      {controls.element}
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
    </>
  );

  if (land) {
    return (
      <TwoPaneGame
        header={header}
        overlay={<PausedOverlay match={match} />}
        left={
          <>
            {banners}
            {rows}
          </>
        }
        right={entry}
        toolbar={toolbar}
        after={sheets}
      />
    );
  }

  return (
    <GameScreen>
      {header}
      <GameBody className="gap-2 px-4 pt-1 pb-3">
        <PausedOverlay match={match} />
        {banners}
        {rows}
      </GameBody>

      <div className="pb-safe sticky bottom-0 z-10 bg-bg">
        {entry && (
          <div className="border-t border-border px-3 pt-2 pb-1">
            <div className="mx-auto max-w-lg">{entry}</div>
          </div>
        )}
        {toolbar}
      </div>
      {sheets}
    </GameScreen>
  );
}
