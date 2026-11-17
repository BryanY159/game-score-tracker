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
import { finalizeMatch, getMatchBundle, type MatchBundle, type SeatResult } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import { ordinal } from '../domain/placement';
import { elapsedMs, formatLength } from '../domain/timer';
import { requireGame } from '../games/registry';
import { completedAt, parcheesiResults, parcheesiState } from '../games/parcheesi/scoring';
import { Gone } from './PlacementScoring';

export function Results() {
  const { matchId = '' } = useParams();
  const bundle = useLiveQuery(() => getMatchBundle(db, matchId), [matchId]);
  if (bundle === undefined) return null;
  if (bundle === null || bundle.match.status !== 'inProgress') return <Gone />;
  return <ParcheesiResults bundle={bundle} />;
}

/** FR-12 for Parcheesi: podium, finishing order, length; Finalize saves (FR-6 AC-4). */
function ParcheesiResults({ bundle }: { bundle: MatchBundle }) {
  const { match, seats } = bundle;
  const navigate = useNavigate();
  const game = requireGame(match.gameKey);
  const [saving, setSaving] = useState(false);
  const controls = useGameControls(match);
  const state = parcheesiState(
    seats.map((s) => s.player.id),
    match.log,
  );
  if (!state.complete) return <Navigate to={`/play/${match.id}`} replace />;

  const endedAt = completedAt(match.log) ?? match.updatedAt;
  const length = elapsedMs({ ...match, endedAt });
  const ranked = seats
    .map((s) => ({ ...s, st: state.players.find((p) => p.playerId === s.player.id)! }))
    .sort((a, b) => a.st.placement! - b.st.placement!);
  const winner = ranked[0]!;

  const podium: PodiumEntry[] = ranked.slice(0, 3).map((r) => ({
    key: r.mp.id,
    name: r.player.name,
    emoji: r.player.emoji,
    color: r.mp.color,
    place: r.st.placement!,
    secondary: `${r.st.pawnsHome} home`,
  }));

  async function finalize() {
    setSaving(true);
    const results: SeatResult[] = parcheesiResults(
      seats.map((s) => ({ matchPlayerId: s.mp.id, playerId: s.player.id })),
      match.log,
    );
    await finalizeMatch(db, match.id, results, endedAt);
    navigate('/', { replace: true });
  }

  return (
    <GameScreen>
      <header className="pt-safe flex flex-col items-center gap-0.5 px-5 pt-8 text-center">
        <NoWrap className="text-[15px] text-text-2">{game.name} · Final results</NoWrap>
        <NoWrap as="h1" truncate className="m-0 max-w-full text-[30px] font-extrabold">
          {winner.player.name} wins
        </NoWrap>
        <NoWrap className="text-[15px] text-text-2">First with all 4 pawns home</NoWrap>
      </header>
      <main className="flex flex-1 flex-col pb-4">
        <Podium entries={podium} />
        <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 px-4">
          {ranked.slice(3).map((r) => (
            <li
              key={r.mp.id}
              className="flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-white"
              style={{ background: COLOR_HEX[r.mp.color] }}
            >
              <Avatar emoji={r.player.emoji} size={36} />
              <NoWrap truncate className="flex-1 text-base font-bold">
                {ordinal(r.st.placement!)} · {r.player.name}
              </NoWrap>
              <NoWrap className="text-[14px]">{r.st.pawnsHome} home</NoWrap>
            </li>
          ))}
        </ul>
        <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
          <Tile label="Length" value={formatLength(length)} />
          <Tile label="Players" value={String(seats.length)} />
        </div>
      </main>
      <BottomToolbar>
        <ToolButton icon={<PencilIcon />} label="Edit scores" onClick={() => navigate(`/play/${match.id}`)} />
        <ToolButton icon={<NotesIcon />} label="Notes" onClick={controls.openNotes} />
        <PrimaryToolButton icon={<CheckIcon />} disabled={saving} onClick={finalize}>
          Finalize
        </PrimaryToolButton>
      </BottomToolbar>
      {controls.element}
    </GameScreen>
  );
}

export function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-surface p-3">
      <NoWrap truncate className="text-[13px] text-text-2">
        {label}
      </NoWrap>
      <NoWrap truncate className="tabular text-xl font-extrabold">
        {value}
      </NoWrap>
    </div>
  );
}
