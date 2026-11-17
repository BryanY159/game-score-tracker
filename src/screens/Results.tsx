import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { GameScreen, PrimaryToolButton, ToolButton } from '../components/GameChrome';
import { CheckIcon, NotesIcon, PencilIcon } from '../components/Icons';
import { useGameControls } from '../components/GameControls';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { Podium, type PodiumEntry } from '../components/Podium';
import { db } from '../db/schema';
import { appendEvent, finalizeMatch, getMatchBundle, type MatchBundle } from '../db/repos/matches';
import { TieScreen, type TieDecision } from '../components/TieScreen';
import { Button } from '../components/Button';
import { COLOR_HEX } from '../domain/colors';
import { ordinal } from '../domain/placement';
import { elapsedMs, formatLength } from '../domain/timer';
import { headline, outcomeFor, sharedNames } from '../games/outcome';
import { requireGame } from '../games/registry';
import { Gone } from './PlacementScoring';

export function Results() {
  const { matchId = '' } = useParams();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null || bundle.match.status !== 'inProgress') return <Gone />;
  return <ResultsView bundle={bundle} />;
}

/** FR-12: podium, places, length; Finalize saves (FR-6 AC-4, FR-10 AC-4). */
function ResultsView({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const [saving, setSaving] = useState(false);
  const controls = useGameControls(match);
  const outcome = outcomeFor(bundle);
  const [tieOpen, setTieOpen] = useState(true);
  if (!outcome.complete) return <Navigate to={`/play/${match.id}`} replace />;
  const tied = outcome.tie;
  const isRounds = requireGame(match.gameKey).template === 'rounds';
  const handicapped = isRounds ? seats.filter((s) => s.mp.target !== null && s.mp.target !== game.defaultTarget) : [];

  async function decideTie(d: TieDecision) {
    await appendEvent(db, match.id, {
      type: 'tieDecision',
      decision: d.kind === 'shared' ? { kind: 'shared', playerIds: tied.map((s) => s.player.id) } : d,
      rounds: outcome.roundCount,
    });
    setTieOpen(false);
  }

  const endedAt = outcome.endedAt ?? match.updatedAt;
  const length = elapsedMs({ ...match, endedAt });
  const podium: PodiumEntry[] = outcome.rows.slice(0, 3).map((r, i) => ({
      key: r.seat.mp.id,
      name: r.seat.player.name,
      emoji: r.seat.player.emoji,
      color: r.seat.mp.color,
      place: r.place,
      step: (i + 1) as 1 | 2 | 3,
      primary: r.detail ? r.value : undefined,
      secondary: r.detail ?? r.value,
    }));
  const rest = outcome.rows.slice(podium.length);

  async function finalize() {
    setSaving(true);
    await finalizeMatch(db, match.id, outcome.results, endedAt, undefined, { endedEarly: outcome.endedEarly });
    navigate('/', { replace: true });
  }

  return (
    <GameScreen>
      <header className="pt-safe flex flex-col items-center gap-0.5 px-5 pt-8 text-center">
        <NoWrap className="text-[15px] text-text-2">{game.name} · Final results</NoWrap>
        <NoWrap as="h1" truncate className="m-0 max-w-full text-[30px] font-extrabold">
          {tied.length ? 'Tied for first' : headline(outcome)}
        </NoWrap>
        {sharedNames(outcome) && (
          <NoWrap truncate className="max-w-full text-[17px] font-bold">
            {sharedNames(outcome)}
          </NoWrap>
        )}
        <NoWrap className="text-[15px] text-text-2">{outcome.subtitle}</NoWrap>
      </header>
      <main className="flex flex-1 flex-col pb-4">
        <Podium entries={podium} />
        <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 px-4">
          {rest.map((r) => (
            <li
              key={r.seat.mp.id}
              className="flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-white"
              style={{ background: COLOR_HEX[r.seat.mp.color] }}
            >
              <Avatar emoji={r.seat.player.emoji} size={36} />
              <NoWrap truncate className="flex-1 text-base font-bold">
                {ordinal(r.place)} · {r.seat.player.name}
              </NoWrap>
              {r.detail && <NoWrap className="tabular text-[14px]">{r.detail.split(' · ')[0]}</NoWrap>}
              <NoWrap className={`tabular ${r.detail ? 'text-[22px] font-extrabold' : 'text-[14px]'}`}>{r.value}</NoWrap>
            </li>
          ))}
        </ul>
        <div className={`mx-4 mt-4 grid gap-2 ${match.gameKey === 'flip7' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Tile label="Length" value={formatLength(length)} />
          {isRounds ? <Tile label="Rounds" value={String(outcome.roundCount)} /> : <Tile label="Players" value={String(seats.length)} />}
          {match.gameKey === 'flip7' && (
            <Tile label="Flip 7s" value={String(outcome.results.reduce((n, r) => n + Number((r.details as { flip7Count?: number }).flip7Count ?? 0), 0))} />
          )}
        </div>
        {isRounds && (
          <p className="mx-4 mt-3 mb-0 rounded-2xl border-[1.5px] border-border px-3.5 py-3 text-[14px] leading-snug text-text-2">
            Winner is the largest margin past their own target.
            {handicapped.map((s) => ` ${s.player.name} played to ${s.mp.target}.`).join('')}
          </p>
        )}
        {tied.length > 0 && (
          <div className="mx-4 mt-3">
            <Button className="w-full" onClick={() => setTieOpen(true)}>
              Settle the tie
            </Button>
          </div>
        )}
      </main>
      <BottomToolbar>
        <ToolButton icon={<PencilIcon />} label="Edit scores" onClick={() => navigate(`/play/${match.id}`)} />
        <ToolButton icon={<NotesIcon />} label="Notes" onClick={controls.openNotes} />
        <PrimaryToolButton icon={<CheckIcon />} disabled={saving || tied.length > 0} onClick={finalize}>
          Finalize
        </PrimaryToolButton>
      </BottomToolbar>
      {controls.element}
      {tied.length > 0 && tieOpen && (
        <TieScreen
          tied={tied}
          reason={`are tied on margin past target and on total.${match.gameKey === 'flip7' ? ' The official rule: everyone plays another round.' : ''}`}
          onClose={() => setTieOpen(false)}
          onDecide={decideTie}
          playAnotherRound={
            match.gameKey === 'flip7'
              ? async () => {
                  await appendEvent(db, match.id, { type: 'extraRound', afterRounds: outcome.roundCount });
                  navigate(`/play/${match.id}`, { replace: true });
                }
              : undefined
          }
        />
      )}
    </GameScreen>
  );
}

export function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-surface p-3">
      <NoWrap className="text-[13px] text-text-2">
        {label}
      </NoWrap>
      <NoWrap className="tabular text-xl font-extrabold">
        {value}
      </NoWrap>
    </div>
  );
}
