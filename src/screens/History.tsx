import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayersIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { EmptyState, ScreenHeader } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { db } from '../db/schema';
import { listRecentFinished, type MatchBundle } from '../db/repos/matches';
import { COLOR_HEX } from '../domain/colors';
import { relativeDay } from '../domain/dates';
import { endTime, filterHistory, groupByPeriod, type HistoryFilter } from '../domain/history';
import { resultLine } from '../domain/summary';
import { elapsedMs, formatLength } from '../domain/timer';
import type { GameKey, Player } from '../domain/types';
import { GAMES, requireGame } from '../games/registry';

/** FR-13 AC-1: finished games, newest first, filtered by game and player. */
export function History() {
  const navigate = useNavigate();
  const all = useLiveQuery(() => listRecentFinished(db), []);
  const [filter, setFilter] = useState<HistoryFilter>({ gameKey: null, playerId: null });
  const [pickPlayer, setPickPlayer] = useState(false);

  if (!all) return <ScreenHeader title="History" />;

  const gamesPlayed = GAMES.filter((g) => all.some((b) => b.match.gameKey === g.key));
  const players = uniquePlayers(all);
  const shown = filterHistory(all, filter);
  const selectedPlayer = players.find((p) => p.id === filter.playerId);
  const setGame = (gameKey: GameKey | null) => setFilter((f) => ({ ...f, gameKey }));

  return (
    <>
      <ScreenHeader title="History" />
      {all.length === 0 ? (
        <EmptyState title="No finished games" body="Every game you finish is saved here, newest first." />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="toolbar" aria-label="Filters">
            <Chip active={filter.gameKey === null} onClick={() => setGame(null)}>
              All games
            </Chip>
            <Chip active={!!selectedPlayer} onClick={() => setPickPlayer(true)} trailing={<ChevronDown />}>
              {selectedPlayer ? selectedPlayer.name : 'All players'}
            </Chip>
            {gamesPlayed.map((g) => (
              <Chip key={g.key} active={filter.gameKey === g.key} onClick={() => setGame(filter.gameKey === g.key ? null : g.key)}>
                {g.name}
              </Chip>
            ))}
          </div>

          {shown.length === 0 && <EmptyState title="No matching games" body="Try another game or player." />}
          <div className="flex flex-col px-4 pt-2">
            {groupByPeriod(shown).map((group) => (
              <section key={group.label}>
                <h2 className="m-0 pt-3 pb-1 text-[14px] font-bold text-text-2">{group.label}</h2>
                <ul className="m-0 grid list-none grid-cols-1 gap-x-6 p-0 md:grid-cols-2">
                  {group.items.map((b) => (
                    <li key={b.match.id}>
                      <HistoryRow b={b} onOpen={() => navigate(`/history/${b.match.id}`)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {pickPlayer && (
        <Sheet title="Filter by player" closeLabel="Close" onClose={() => setPickPlayer(false)}>
          <div className="flex flex-col gap-1">
            {[{ id: null, name: 'All players', emoji: '', color: null } as const, ...players].map((p) => (
              <button
                key={p.id ?? 'all'}
                type="button"
                aria-pressed={filter.playerId === p.id}
                onClick={() => {
                  setFilter((f) => ({ ...f, playerId: p.id }));
                  setPickPlayer(false);
                }}
                className={`flex h-12 items-center gap-3 rounded-2xl px-2 text-left text-[16px] ${
                  filter.playerId === p.id ? 'bg-surface font-extrabold' : 'font-bold'
                }`}
              >
                {p.color ? (
                  <span className="rounded-full" style={{ background: COLOR_HEX[p.color] }}>
                    <Avatar emoji={p.emoji} size={36} />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface">
                    <PlayersIcon width={18} height={18} />
                  </span>
                )}
                <NoWrap truncate className="flex-1">
                  {p.name}
                </NoWrap>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function HistoryRow({ b, onOpen }: { b: MatchBundle; onOpen: () => void }) {
  const winners = b.seats.filter((s) => s.mp.isWinner);
  const single = winners.length === 1 ? winners[0]! : null;
  return (
    <button type="button" onClick={onOpen} className="flex h-[68px] w-full items-center gap-3 border-b border-border text-left text-text">
      {single ? (
        <span className="rounded-full" style={{ background: COLOR_HEX[single.mp.color] }}>
          <Avatar emoji={single.player.emoji} size={40} />
        </span>
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface" aria-hidden="true">
          <PlayersIcon width={20} height={20} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <NoWrap truncate className="text-base font-extrabold">
          {requireGame(b.match.gameKey).name}
        </NoWrap>
        <NoWrap truncate className="text-[13px] text-text-2">
          {resultLine(b)}
        </NoWrap>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <NoWrap className="text-[13px] font-bold">{relativeDay(endTime(b))}</NoWrap>
        <NoWrap className="text-[13px] text-text-2">{formatLength(elapsedMs(b.match))}</NoWrap>
      </span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[22px] px-3.5 text-[14px] font-bold ${
        active ? 'bg-btn text-btn-text' : 'border-[1.5px] border-border text-text'
      }`}
    >
      <NoWrap>{children}</NoWrap>
      {trailing}
    </button>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Saved players who appear in history (deleted ones included, guests left out). */
function uniquePlayers(all: MatchBundle[]): Player[] {
  const map = new Map<string, Player>();
  for (const b of all) for (const s of b.seats) if (!s.player.isGuest) map.set(s.player.id, s.player);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
