import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameBody, GameHeader, GameScreen, PrimaryToolButton, TimerChip, ToolButton, TwoPaneGame } from '../components/GameChrome';
import { useLandscape } from '../hooks/useLandscape';
import { PausedOverlay, PauseButton, useGameControls, useGameShortcuts } from '../components/GameControls';
import { CancelIcon, RoundsIcon, UndoIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { db } from '../db/schema';
import type { MatchBundle } from '../db/repos/matches';
import { appendTurn, editTurn, undoTurn } from '../db/repos/turnLogs';
import { COLOR_HEX } from '../domain/colors';
import { canClaim, ROUTE_LENGTHS, ROUTE_POINTS, ttrState } from '../games/ticketToRide/scoring';
import { describeTurn, TurnLogSheet } from '../games/ticketToRide/TurnLogSheet';
import { requireGame } from '../games/registry';
import { useCelebrate } from '../components/Celebration';
import { CountUp } from '../components/CountUp';
import { digitOf, key } from '../hooks/useShortcuts';

/** FR-7 AC-1 to AC-5: the turn tracker. */
export function TtrTurns({ bundle }: { bundle: MatchBundle }) {
  const { match, seats, turns } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const controls = useGameControls(match);
  const paused = match.pausedAt !== null;
  const ids = seats.map((s) => s.player.id);
  const st = ttrState(ids, turns);
  const [logOpen, setLogOpen] = useState(false);
  const seatOf = (id: string) => seats.find((s) => s.player.id === id)!;
  const cur = seatOf(st.current);
  const curState = st.players.find((p) => p.playerId === st.current)!;

  // The final round starting gets a mini celebration (FR-19 AC-2).
  const celebrate = useCelebrate();
  const finalWas = useRef(!!st.finalRound);
  useEffect(() => {
    if (st.finalRound && !finalWas.current) celebrate('finalRound', seatOf(st.finalRound.triggeredBy).player.name);
    finalWas.current = !!st.finalRound;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!st.finalRound]);

  // After every player's last turn, go to end-of-game scoring (AC-5).
  const was = useRef(st.playComplete);
  useEffect(() => {
    if (st.playComplete && !was.current) navigate(`/play/${match.id}/final`);
    was.current = st.playComplete;
  }, [st.playComplete, match.id, navigate]);

  const act = (action: 'route' | 'drawTrains' | 'drawTickets', routeLength?: number) =>
    appendTurn(db, match.id, { playerId: st.current, action, routeLength });
  const disabled = paused || st.playComplete;
  // FR-20 AC-3.
  useGameShortcuts(game.name, match, {
    back: controls.exitToHome,
    undo: { run: () => void undoTurn(db, match.id), enabled: turns.length > 0 },
    keys: [
      {
        keys: '1–6',
        label: 'Claim a route of that length',
        match: (e) => { const d = digitOf(e); return d !== null && d >= 1 && d <= 6; },
        run: (e) => { const len = digitOf(e)!; if (!disabled && canClaim(st, st.current, len)) void act('route', len); },
      },
      { keys: 'T', label: 'Draw train cards', match: key('t'), run: () => void act('drawTrains'), enabled: !disabled },
      { keys: 'D', label: 'Draw tickets', match: key('d'), run: () => void act('drawTickets'), enabled: !disabled },
      { keys: 'L', label: 'Turn log', match: key('l'), run: () => setLogOpen(true) },
      { keys: 'Enter', label: 'Final scoring', match: key('Enter'), run: () => navigate(`/play/${match.id}/final`), enabled: st.playComplete && !paused },
    ],
  });

  const land = useLandscape();
  const header = (
      <GameHeader
        title={game.name}
        sub={`Turn ${st.turn + 1}`}
        onBack={controls.exitToHome}
        trailing={
          <TimerChip match={match}>
            <PauseButton match={match} />
          </TimerChip>
        }
      />
  );
  const finalBanner = (
    <>
        {st.finalRound && !st.playComplete && (
          <p className="m-0 rounded-2xl bg-btn px-3.5 py-3 text-[15px] leading-snug font-bold text-btn-text" role="status">
            Final round: {seatOf(st.finalRound.triggeredBy).player.name} is down to {FINAL(st)} trains. {st.finalRound.turnsLeft}{' '}
            {st.finalRound.turnsLeft === 1 ? 'turn' : 'turns'} left.
          </p>
        )}
    </>
  );
  const current = (
        <div
          className="flex items-center gap-3 rounded-[28px] px-4 py-3.5 text-white"
          style={{ background: COLOR_HEX[cur.mp.color], boxShadow: cur.mp.color === 'black' ? 'inset 0 0 0 1.5px var(--black-outline)' : undefined }}
        >
          <Avatar emoji={cur.player.emoji} size={48} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <NoWrap className="text-[14px]">Current turn</NoWrap>
            <NoWrap truncate className="text-2xl font-extrabold">
              {cur.player.name}
            </NoWrap>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <NoWrap className="text-[14px]">Trains left</NoWrap>
            <NoWrap className="tabular text-[26px] font-extrabold" aria-label={`${cur.player.name} trains left`}>
              {curState.trains}
            </NoWrap>
          </div>
        </div>

  );
  const claim = (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold text-text-2">Claim a route</h2>
          <div className={`grid grid-cols-3 gap-2 ${land ? '' : 'md:grid-cols-6'}`}>
            {ROUTE_LENGTHS.map((len) => (
              <button
                key={len}
                type="button"
                aria-label={`Claim a ${len}-route`}
                disabled={disabled || !canClaim(st, st.current, len)}
                onClick={() => act('route', len)}
                className="flex h-[60px] flex-col items-center justify-center rounded-2xl border-[1.5px] border-text leading-tight text-text disabled:opacity-30"
              >
                <span className="tabular text-[22px] font-extrabold">{len}</span>
                <NoWrap className="text-[13px] text-text-2">
                  {ROUTE_POINTS[len]} {ROUTE_POINTS[len] === 1 ? 'pt' : 'pts'}
                </NoWrap>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={disabled} onClick={() => act('drawTrains')} className="h-[52px] rounded-2xl bg-surface text-[15px] font-bold text-text disabled:opacity-40">
              <NoWrap>Draw train cards</NoWrap>
            </button>
            <button type="button" disabled={disabled} onClick={() => act('drawTickets')} className="h-[52px] rounded-2xl bg-surface text-[15px] font-bold text-text disabled:opacity-40">
              <NoWrap>Draw tickets</NoWrap>
            </button>
          </div>
        </section>

  );
  const board = (
        <section className="flex flex-col gap-1.5">
          <div className="flex justify-between px-1 text-[13px] text-text-2">
            <NoWrap>Turn order</NoWrap>
            <NoWrap>Trains · Points</NoWrap>
          </div>
          <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 md:grid-cols-2" aria-label="Scoreboard">
            {seats.map((s) => {
              const p = st.players.find((x) => x.playerId === s.player.id)!;
              const now = s.player.id === st.current && !st.playComplete;
              return (
                <li
                  key={s.mp.id}
                  className="flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-white"
                  style={{ background: COLOR_HEX[s.mp.color], boxShadow: s.mp.color === 'black' ? 'inset 0 0 0 1.5px var(--black-outline)' : undefined }}
                >
                  <Avatar emoji={s.player.emoji} size={36} />
                  <NoWrap truncate className="flex-1 text-base font-bold">
                    {s.player.name}
                  </NoWrap>
                  {now && <NoWrap className="rounded-lg bg-white/22 px-2 text-[12px] font-bold">now</NoWrap>}
                  <NoWrap className="tabular w-8 text-right text-[15px]">{p.trains}</NoWrap>
                  <CountUp
                    value={p.routePoints}
                    data-nowrap=""
                    className="tabular w-10 text-right text-[20px] font-extrabold whitespace-nowrap"
                    aria-label={`${s.player.name} route points`}
                  />
                </li>
              );
            })}
          </ul>
        </section>

  );
  const lastTurns = (
    <>
        {turns.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="m-0 text-[15px] font-bold text-text-2">Last turns</h2>
            {turns
              .slice(-2)
              .reverse()
              .map((e, i) => {
                const d = describeTurn(e, seatOf(e.playerId).player.name);
                return (
                  <div key={i} className="flex items-center justify-between text-[14px]">
                    <NoWrap truncate>{d.text}</NoWrap>
                    <NoWrap className="font-bold">{d.points}</NoWrap>
                  </div>
                );
              })}
          </section>
        )}
    </>
  );
  const toolbar = (
      <BottomToolbar>
        <ToolButton icon={<UndoIcon />} label="Undo" disabled={paused || turns.length === 0} onClick={() => undoTurn(db, match.id)} />
        <ToolButton icon={<RoundsIcon />} label="Turn log" onClick={() => setLogOpen(true)} />
        <PrimaryToolButton disabled={paused || !st.playComplete} onClick={() => navigate(`/play/${match.id}/final`)}>
          Final scoring
        </PrimaryToolButton>
        <ToolButton icon={<CancelIcon />} label="Cancel" onClick={controls.openCancel} />
      </BottomToolbar>
  );
  const sheets = (
    <>
      {controls.element}
      {logOpen && (
        <TurnLogSheet
          seats={seats}
          turns={turns}
          onClose={() => setLogOpen(false)}
          onEdit={(index, change) => editTurn(db, match.id, index, change)}
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
            {finalBanner}
            {current}
            {board}
            {lastTurns}
          </>
        }
        right={claim}
        toolbar={toolbar}
        after={sheets}
      />
    );
  }

  return (
    <GameScreen>
      {header}
      <GameBody className="gap-3 px-4 pt-1 pb-4">
        <PausedOverlay match={match} />
        {finalBanner}
        {current}
        {claim}
        {board}
        {lastTurns}
      </GameBody>
      {toolbar}
      {sheets}
    </GameScreen>
  );
}

function FINAL(st: ReturnType<typeof ttrState>) {
  return st.players.find((p) => p.playerId === st.finalRound!.triggeredBy)!.trains;
}
