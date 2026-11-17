import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { EmptyState, ScreenHeader } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { db } from '../db/schema';
import { loadStats } from '../db/repos/stats';
import { COLOR_HEX } from '../domain/colors';
import { busiestPair, flip7Rates, gameSpecific, headToHead, overall, perGame, winTrend, type GameRecord } from '../domain/stats';
import type { GameKey, Player } from '../domain/types';
import { GAMES, requireGame } from '../games/registry';

const WinTrend = lazy(() => import('../components/charts/WinTrend'));
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** FR-14: per-game and overall stats, head to head, game records and the win % trend. */
export function Stats() {
  const data = useLiveQuery(async () => ({ ...(await loadStats(db)), profiles: await db.players.toArray() }), []);
  const [tab, setTab] = useState<GameKey | null>(null);
  if (!data) return <ScreenHeader title="Stats" />;
  const { records, players, minGames, profiles } = data;
  const profile = (id: string) => profiles.find((p) => p.id === id)!;
  const played = GAMES.filter((g) => records.some((r) => r.gameKey === g.key));

  return (
    <>
      <ScreenHeader title="Stats" />
      {records.length === 0 || players.length === 0 ? (
        <EmptyState title="No stats yet" body="Win rates and records appear once players have played a few games." />
      ) : (
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex flex-wrap gap-2 px-4" role="tablist" aria-label="Games">
            <Chip on={tab === null} onClick={() => setTab(null)}>
              All games
            </Chip>
            {played.map((g) => (
              <Chip key={g.key} on={tab === g.key} onClick={() => setTab(g.key)}>
                {g.name}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 px-4 md:grid-cols-2">
            <Leaderboard records={records} players={players} minGames={minGames} tab={tab} profile={profile} />
            <div className="flex flex-col gap-5">
              <HeadToHead records={records} players={players} tab={tab} profile={profile} />
              {tab === 'flip7' && <Flip7Rates records={records} players={players} minGames={minGames} profile={profile} />}
              {tab && <GameRecords records={records} tab={tab} eligible={new Set(perGame(records, tab, players, minGames).filter((s) => s.eligible).map((s) => s.playerId))} profile={profile} />}
            </div>
          </div>
          <section className="flex flex-col gap-2 px-4">
            <h2 className="m-0 text-[17px] font-extrabold">Win % over time</h2>
            <Suspense fallback={<div className="h-56 rounded-2xl bg-surface" />}>
              <WinTrend
                data={winTrend(records, tab, players)}
                lines={players
                  .filter((p) => records.some((r) => (!tab || r.gameKey === tab) && r.seats.some((s) => s.playerId === p.id)))
                  .map((p) => ({ id: p.id, name: p.name, color: profile(p.id).color }))}
              />
            </Suspense>
          </section>
        </div>
      )}
    </>
  );
}

function Leaderboard({
  records,
  players,
  minGames,
  tab,
  profile,
}: {
  records: GameRecord[];
  players: { id: string; name: string }[];
  minGames: number;
  tab: GameKey | null;
  profile: (id: string) => Player;
}) {
  const rows = tab
    ? perGame(records, tab, players, minGames).map((s) => ({
        id: s.playerId,
        eligible: s.eligible,
        rate: s.winRate,
        games: s.games,
        sub: [
          s.avgPlacement !== null ? `avg place ${s.avgPlacement.toFixed(1)}` : null,
          s.avgMargin !== null ? `avg margin ${s.avgMargin >= 0 ? '+' : '−'}${Math.abs(Math.round(s.avgMargin))}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }))
    : overall(records, players, minGames, GAMES.map((g) => g.key)).map((s) => ({
        id: s.playerId,
        eligible: s.eligible,
        rate: s.winRate,
        games: s.games,
        sub: s.eligible ? `across ${s.gamesCounted} ${s.gamesCounted === 1 ? 'game' : 'games'}` : '',
      }));
  const shown = rows.filter((r) => r.games > 0);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[17px] font-extrabold">Win rate</h2>
        <NoWrap className="text-[13px] text-text-2">min {minGames} games</NoWrap>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Win rate">
        {shown.map((r) => {
          const p = profile(r.id);
          return (
            <li key={r.id} className="flex items-center gap-3">
              <span className="rounded-full" style={{ background: COLOR_HEX[p.color] }}>
                <Avatar emoji={p.emoji} size={40} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <NoWrap truncate className="text-base font-bold">
                    {p.name}
                  </NoWrap>
                  {r.eligible ? (
                    <NoWrap className="tabular text-base font-extrabold">{pct(r.rate)}</NoWrap>
                  ) : (
                    <NoWrap className="text-[13px] text-text-2">
                      {r.games} of {minGames} games played
                    </NoWrap>
                  )}
                </div>
                {r.eligible && (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, r.rate * 100)}%`, background: COLOR_HEX[p.color] }} />
                    </div>
                    <NoWrap truncate className="text-[13px] text-text-2">
                      {[`${r.games} ${r.games === 1 ? 'game' : 'games'}`, r.sub].filter(Boolean).join(' · ')}
                    </NoWrap>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HeadToHead({ records, players, tab, profile }: { records: GameRecord[]; players: { id: string; name: string }[]; tab: GameKey | null; profile: (id: string) => Player }) {
  const [picked, setPicked] = useState<[string, string] | null>(null);
  const [choosing, setChoosing] = useState<0 | 1 | null>(null);
  if (players.length < 2) return null;
  const [a, b] = picked ?? busiestPair(records, players, tab)!;
  const h = headToHead(records, a, b, tab);
  const pa = profile(a);
  const pb = profile(b);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-[17px] font-extrabold">Head to head</h2>
      <div className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-border p-3.5">
        <div className="flex items-center gap-2">
          <PickButton player={pa} onClick={() => setChoosing(0)} />
          <NoWrap className="text-[13px] text-text-2">vs</NoWrap>
          <PickButton player={pb} onClick={() => setChoosing(1)} />
        </div>
        {h.games === 0 ? (
          <p className="m-0 text-[14px] text-text-2">No games together yet.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <NoWrap className="tabular text-3xl font-extrabold" aria-label={`${pa.name} wins`}>
                {h.aWins}
              </NoWrap>
              <NoWrap className="text-[13px] text-text-2">
                {h.games} {h.games === 1 ? 'game' : 'games'}
                {h.ties ? ` · ${h.ties} tied` : ''}
              </NoWrap>
              <NoWrap className="tabular text-3xl font-extrabold" aria-label={`${pb.name} wins`}>
                {h.bWins}
              </NoWrap>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <div style={{ width: `${(h.aWins / h.games) * 100}%`, background: COLOR_HEX[pa.color] }} />
              <div className="flex-1" />
              <div style={{ width: `${(h.bWins / h.games) * 100}%`, background: COLOR_HEX[pb.color] }} />
            </div>
            {(h.aAvgMargin !== null || h.bAvgMargin !== null) && (
              <p className="m-0 text-[13px] text-text-2">
                Avg margin when winning: {pa.name} {h.aAvgMargin !== null ? `+${Math.round(h.aAvgMargin)}` : '–'}, {pb.name} {h.bAvgMargin !== null ? `+${Math.round(h.bAvgMargin)}` : '–'}
              </p>
            )}
          </>
        )}
      </div>
      {choosing !== null && (
        <Sheet title="Choose a player" closeLabel="Close" onClose={() => setChoosing(null)}>
          <div className="flex flex-col gap-1">
            {players
              .filter((p) => p.id !== (choosing === 0 ? b : a))
              .map((p) => {
                const pr = profile(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPicked(choosing === 0 ? [p.id, b] : [a, p.id]);
                      setChoosing(null);
                    }}
                    className="flex h-12 items-center gap-3 rounded-2xl px-2 text-left text-[16px] font-bold"
                  >
                    <span className="rounded-full" style={{ background: COLOR_HEX[pr.color] }}>
                      <Avatar emoji={pr.emoji} size={36} />
                    </span>
                    <NoWrap truncate>{p.name}</NoWrap>
                  </button>
                );
              })}
          </div>
        </Sheet>
      )}
    </section>
  );
}

function PickButton({ player, onClick }: { player: Player; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Change ${player.name}`}
      className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[22px] pr-3 pl-1 text-white"
      style={{ background: COLOR_HEX[player.color] }}
    >
      <Avatar emoji={player.emoji} size={34} />
      <NoWrap truncate className="text-[15px] font-bold">
        {player.name}
      </NoWrap>
    </button>
  );
}

function GameRecords({ records, tab, eligible, profile }: { records: GameRecord[]; tab: GameKey; eligible: Set<string>; profile: (id: string) => Player }) {
  const recs = gameSpecific(records, tab, eligible);
  if (!recs.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-[17px] font-extrabold">{requireGame(tab).name} records</h2>
      <ul className="m-0 flex list-none flex-col p-0" aria-label="Records">
        {recs.map((r) => (
          <li key={r.label} className="flex min-h-12 items-center gap-3 border-b border-border py-1 last:border-b-0">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] leading-snug text-text-2">{r.label}</span>
              {r.playerId && (
                <NoWrap truncate className="text-base font-bold">
                  {profile(r.playerId).emoji} {profile(r.playerId).name}
                </NoWrap>
              )}
            </div>
            <NoWrap className="tabular text-xl font-extrabold">{r.value}</NoWrap>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`flex h-11 shrink-0 items-center rounded-[22px] px-3.5 text-[14px] font-bold ${on ? 'bg-btn text-btn-text' : 'border-[1.5px] border-border text-text'}`}
    >
      <NoWrap>{children}</NoWrap>
    </button>
  );
}

/** FR-14 AC-5 (M13): Flip 7 rate and bust rate per player, as % of rounds played. */
function Flip7Rates({ records, players, minGames, profile }: { records: GameRecord[]; players: { id: string; name: string }[]; minGames: number; profile: (id: string) => Player }) {
  const rows = flip7Rates(records, players, minGames);
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[17px] font-extrabold">Flip 7 and bust rates</h2>
        <NoWrap className="text-[13px] text-text-2">% of rounds</NoWrap>
      </div>
      <ul className="m-0 flex list-none flex-col p-0" aria-label="Flip 7 and bust rates">
        {rows.map((r) => {
          const p = profile(r.playerId);
          return (
            <li key={r.playerId} className="flex min-h-12 items-center gap-3 border-b border-border py-1 last:border-b-0">
              <span className="rounded-full" style={{ background: COLOR_HEX[p.color] }}>
                <Avatar emoji={p.emoji} size={36} />
              </span>
              <NoWrap truncate className="min-w-0 flex-1 text-base font-bold">
                {p.name}
              </NoWrap>
              {r.eligible ? (
                <div className="flex shrink-0 gap-3 text-right">
                  <span className="flex flex-col leading-tight">
                    <NoWrap className="text-[12px] text-text-2">Flip 7</NoWrap>
                    <NoWrap className="tabular text-base font-extrabold" aria-label={`${p.name} Flip 7 rate`}>
                      {pct(r.flip7Rate)}
                    </NoWrap>
                  </span>
                  <span className="flex flex-col leading-tight">
                    <NoWrap className="text-[12px] text-text-2">Bust</NoWrap>
                    <NoWrap className="tabular text-base font-extrabold" aria-label={`${p.name} bust rate`}>
                      {pct(r.bustRate)}
                    </NoWrap>
                  </span>
                </div>
              ) : (
                <NoWrap className="text-[13px] text-text-2">
                  {r.games} of {minGames} games played
                </NoWrap>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
