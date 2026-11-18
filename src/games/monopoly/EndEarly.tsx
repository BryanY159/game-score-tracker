import { useState } from 'react';
import { BottomToolbar } from '../../components/BottomToolbar';
import { GameHeader, GameScreen, PrimaryToolButton } from '../../components/GameChrome';
import { Keypad } from '../../components/Keypad';
import { NoWrap } from '../../components/NoWrap';
import { Avatar } from '../../components/PlayerPill';
import { SortableList } from '../../components/SortableList';
import { TieScreen, type TieDecision } from '../../components/TieScreen';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { ordinal } from '../../domain/placement';
import type { MatchEvent } from '../../domain/types';
import { formatMoney, rankByNetWorth, topTie, type MonopolyState } from './scoring';

type EndEarlyEntry = Omit<Extract<MatchEvent, { type: 'endEarly' }>, 'at'>;

/**
 * FR-10 AC-3: net worth for each remaining player (custom keypad, FR-18 AC-2),
 * then the ranking, which can be dragged. A tie for first opens the tie screen.
 */
export function EndEarly({
  seats,
  state,
  onCancel,
  onDone,
}: {
  seats: Seat[];
  state: MonopolyState;
  onCancel: () => void;
  onDone: (entry: EndEarlyEntry) => void;
}) {
  const remaining = state.remaining;
  const seatOf = (id: string) => seats.find((s) => s.player.id === id)!;
  const [worth, setWorth] = useState<Record<string, number | null>>(() => Object.fromEntries(remaining.map((id) => [id, null])));
  const [active, setActive] = useState(remaining[0]!);
  const [step, setStep] = useState<'worth' | 'rank'>('worth');
  const [order, setOrder] = useState<string[]>([]);
  const [tie, setTie] = useState<string[] | null>(null);

  const allEntered = remaining.every((id) => worth[id] !== null);
  const netWorth = Object.fromEntries(remaining.map((id) => [id, worth[id] ?? 0]));
  const activeIndex = remaining.indexOf(active);
  const isLast = activeIndex === remaining.length - 1;

  function toRank() {
    setOrder(rankByNetWorth(remaining, netWorth));
    setStep('rank');
  }

  function finish() {
    const tied = topTie(order, netWorth);
    if (tied.length) setTie(tied);
    else onDone({ type: 'endEarly', netWorth, order, tie: null });
  }

  function decide(d: TieDecision) {
    const tied = tie!;
    if (d.kind === 'shared') {
      const first = order.filter((id) => tied.includes(id));
      onDone({ type: 'endEarly', netWorth, order: [...first, ...order.filter((id) => !tied.includes(id))], tie: { kind: 'shared', playerIds: tied } });
    } else {
      onDone({ type: 'endEarly', netWorth, order: [d.winnerId, ...order.filter((id) => id !== d.winnerId)], tie: { kind: 'picked', winnerId: d.winnerId } });
    }
  }

  if (step === 'worth') {
    return (
      <GameScreen>
        <GameHeader title="End game early" sub="Enter each player's net worth" onBack={onCancel} />
        <main className="flex flex-1 flex-col gap-2 px-4 pb-3">
          {remaining.map((id) => {
            const s = seatOf(id);
            const selected = id === active;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(id)}
                className="flex h-14 items-center gap-2.5 rounded-[28px] pr-2 pl-2 text-left text-white"
                style={{
                  background: COLOR_HEX[s.mp.color],
                  boxShadow: selected ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)' : undefined,
                }}
              >
                <Avatar emoji={s.player.emoji} />
                <NoWrap truncate className="flex-1 text-[17px] font-bold">
                  {s.player.name}
                </NoWrap>
                <NoWrap className="tabular flex h-10 min-w-20 items-center justify-end rounded-[20px] bg-white px-3.5 text-lg font-extrabold text-[#1F2430]">
                  {worth[id] === null ? '–' : formatMoney(worth[id]!)}
                </NoWrap>
              </button>
            );
          })}
        </main>
        <div className="pb-safe sticky bottom-0">
          <Keypad
            label={`${seatOf(active).player.name}'s net worth`}
            format={formatMoney}
            value={worth[active] ?? null}
            onChange={(v) => setWorth((w) => ({ ...w, [active]: v }))}
            next={
              isLast
                ? { label: 'Rank players', onPress: toRank, disabled: !allEntered }
                : { label: 'Next player', onPress: () => setActive(remaining[activeIndex + 1]!) }
            }
          />
        </div>
      </GameScreen>
    );
  }

  const bankrupt = state.players.filter((p) => p.placement !== null).sort((a, b) => a.placement! - b.placement!);
  return (
    <GameScreen>
      <GameHeader title="Final order" sub="Ranked by net worth" onBack={() => setStep('worth')} />
      <main className="flex flex-1 flex-col gap-2 px-4 pb-4">
        <p className="m-0 text-[14px] text-text-2">Drag to change the order before finishing.</p>
        <SortableList
          items={order}
          getId={(id) => id}
          getLabel={(id) => seatOf(id).player.name}
          onReorder={setOrder}
          render={(id, i) => {
            const s = seatOf(id);
            return (
              <div className="flex h-14 items-center gap-2.5 rounded-[28px] pr-4 pl-2 text-white" style={{ background: COLOR_HEX[s.mp.color] }}>
                <Avatar emoji={s.player.emoji} />
                <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
                  <NoWrap truncate className="text-[17px] font-bold">
                    {s.player.name}
                  </NoWrap>
                  <NoWrap className="text-[13px]">{ordinal(i + 1)}</NoWrap>
                </div>
                <NoWrap className="tabular text-[17px] font-extrabold">{formatMoney(netWorth[id] ?? 0)}</NoWrap>
              </div>
            );
          }}
        />
        {bankrupt.length > 0 && (
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 pl-[42px]" aria-label="Bankrupt">
            {bankrupt.map((p) => {
              const s = seatOf(p.playerId);
              return (
                <li key={p.playerId} className="flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-white opacity-55" style={{ background: COLOR_HEX[s.mp.color] }}>
                  <Avatar emoji={s.player.emoji} size={36} />
                  <NoWrap truncate className="flex-1 text-base font-bold">
                    {s.player.name}
                  </NoWrap>
                  <NoWrap className="text-[14px]">Bankrupt</NoWrap>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomToolbar>
        <PrimaryToolButton onClick={finish}>See results</PrimaryToolButton>
      </BottomToolbar>
      {tie && (
        <TieScreen
          tied={tie.map(seatOf)}
          reason={`have the same net worth (${formatMoney(netWorth[tie[0]!] ?? 0)}).`}
          onClose={() => setTie(null)}
          onDecide={decide}
        />
      )}
    </GameScreen>
  );
}
