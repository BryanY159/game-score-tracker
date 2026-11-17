import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Button } from '../components/Button';
import { PlusIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { Avatar } from '../components/PlayerPill';
import { EMOJIS } from '../components/Pickers';
import { EmptyState, ScreenHeader } from '../components/Screen';
import { db } from '../db/schema';
import { gamesPlayedByPlayer, listPlayers, suggestColor } from '../db/repos/players';
import { COLOR_HEX } from '../domain/colors';
import type { Player } from '../domain/types';
import { loadStats } from '../db/repos/stats';
import { overall } from '../domain/stats';
import { GAMES } from '../games/registry';
import { PlayerEdit } from './PlayerEdit';

type Editing = { mode: 'new' } | { mode: 'edit'; player: Player } | null;

export function Players() {
  const players = useLiveQuery(() => listPlayers(db), []);
  const games = useLiveQuery(() => gamesPlayedByPlayer(db), []);
  const stats = useLiveQuery(async () => {
    const { records, players: ps, minGames } = await loadStats(db);
    return { minGames, overall: new Map(overall(records, ps, minGames, GAMES.map((g) => g.key)).map((o) => [o.playerId, o])) };
  }, []);
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <>
      <ScreenHeader
        title="Players"
        trailing={
          <Button icon={<PlusIcon width={18} height={18} />} onClick={() => setEditing({ mode: 'new' })}>
            Add player
          </Button>
        }
      />
      {players && players.length === 0 && (
        <EmptyState title="No players yet" body="Saved players keep their history and stats over time." />
      )}
      <ul className="m-0 grid list-none grid-cols-1 gap-x-6 px-4 md:grid-cols-2">
        {players?.map((p) => {
          const n = games?.get(p.id) ?? 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setEditing({ mode: 'edit', player: p })}
                className="flex h-[68px] w-full items-center gap-3 border-b border-border text-left text-text"
              >
                <span className="rounded-full" style={{ background: COLOR_HEX[p.color] }}>
                  <Avatar emoji={p.emoji} size={44} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <NoWrap truncate className="text-[17px] font-extrabold">
                    {p.name}
                  </NoWrap>
                  <NoWrap truncate className="text-[13px] text-text-2">
                    {n === 0
                      ? 'No games yet'
                      : [
                          `${n} ${n === 1 ? 'game' : 'games'}`,
                          p.hideFromStats
                            ? null
                            : stats?.overall.get(p.id)?.eligible
                              ? `${Math.round(stats.overall.get(p.id)!.winRate * 100)}% wins`
                              : stats
                                ? `stats after ${stats.minGames}`
                                : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                  </NoWrap>
                </span>
                {p.hideFromStats && (
                  <NoWrap className="flex h-[26px] shrink-0 items-center rounded-[13px] bg-surface px-2.5 text-xs font-bold text-text-2">
                    Hidden from stats
                  </NoWrap>
                )}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-text-2">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {editing && (
        <PlayerEdit
          player={editing.mode === 'edit' ? editing.player : undefined}
          initial={{ name: '', emoji: EMOJIS.find((e) => !players?.some((p) => p.emoji === e)) ?? '🦊', color: suggestColor(players ?? []), hideFromStats: false }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
