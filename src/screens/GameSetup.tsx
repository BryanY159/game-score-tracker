import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BottomToolbar } from '../components/BottomToolbar';
import { Button } from '../components/Button';
import { GameHeader } from '../components/GameChrome';
import { GripIcon, PlayIcon, PlusIcon, ShuffleIcon } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { Toggle } from '../components/Pickers';
import { Avatar, PlayerPill } from '../components/PlayerPill';
import { Sheet } from '../components/Sheet';
import { db } from '../db/schema';
import { listPlayers } from '../db/repos/players';
import { createMatch } from '../db/repos/matches';
import { assignColor, COLOR_HEX, COLOR_NAME, freeColors } from '../domain/colors';
import type { GameDefinition, Player, PlayerColor } from '../domain/types';
import { getGame, playerLimits } from '../games/registry';

interface SetupPlayer {
  key: string;
  playerId: string | null;
  name: string;
  emoji: string;
  profileColor: PlayerColor;
  color: PlayerColor;
  /** Target games only (FR-3 AC-2): editable per player for handicaps. */
  target: number | null;
}

const GUEST_EMOJI = '🙂';

/** FR-3: pick players, turn order, first player, colors, then start. */
export function GameSetup() {
  const { gameKey } = useParams();
  const game = getGame(gameKey ?? '');
  if (!game || !game.available) return <Navigate to="/new" replace />;
  return <Setup game={game} />;
}

function Setup({ game }: { game: GameDefinition }) {
  const navigate = useNavigate();
  const saved = useLiveQuery(() => listPlayers(db), []);
  const [lineup, setLineup] = useState<SetupPlayer[]>([]);
  const [override, setOverride] = useState(false);
  const [options, setOptions] = useState<string | null>(null);
  const [guestOpen, setGuestOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const limits = playerLimits(game, override);
  const normal = playerLimits(game, false);
  const full = lineup.length >= limits.max;
  const targetsOk = lineup.every((p) => game.defaultTarget === null || (p.target !== null && p.target > 0));
  const canStart = lineup.length >= limits.min && lineup.length <= limits.max && targetsOk && !starting;

  function add(p: { playerId: string | null; name: string; emoji: string; color: PlayerColor }) {
    setLineup((l) => {
      const color = assignColor(p.color, game.pieceColors, l.map((x) => x.color));
      if (!color || l.length >= limits.max) return l;
      return [...l, { key: p.playerId ?? `guest-${crypto.randomUUID()}`, ...p, profileColor: p.color, color, target: game.defaultTarget }];
    });
  }
  const remove = (key: string) => setLineup((l) => l.filter((x) => x.key !== key));
  const update = (key: string, patch: Partial<SetupPlayer>) =>
    setLineup((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  // Picking who goes first rotates the order, keeping everyone's relative seats (FR-3 step 4).
  const makeFirst = (key: string) =>
    setLineup((l) => {
      const i = l.findIndex((x) => x.key === key);
      return i <= 0 ? l : [...l.slice(i), ...l.slice(0, i)];
    });
  const randomize = () =>
    setLineup((l) => {
      const a = [...l];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setLineup((l) => {
      const from = l.findIndex((x) => x.key === e.active.id);
      const to = l.findIndex((x) => x.key === e.over!.id);
      return arrayMove(l, from, to);
    });
  }

  async function start() {
    setStarting(true);
    const match = await createMatch(
      db,
      game.key,
      lineup.map((p) => ({
        playerId: p.playerId,
        guestName: p.playerId ? undefined : p.name,
        emoji: p.emoji,
        color: p.color,
        target: p.target ?? game.defaultTarget,
      })),
    );
    navigate(`/play/${match.id}`, { replace: true });
  }

  const available = (saved ?? []).filter((p) => !lineup.some((x) => x.playerId === p.id));
  const optionsFor = lineup.find((x) => x.key === options);
  const countHint =
    lineup.length < normal.min
      ? `Add at least ${normal.min} players`
      : `${lineup.length} ${lineup.length === 1 ? 'player' : 'players'} · ${normal.min}–${normal.max} allowed`;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <GameHeader title={`${game.name} setup`} sub={countHint} backTo="/new" />

      <main className="flex flex-1 flex-col gap-5 px-4 pb-6">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[17px] font-extrabold">Turn order</h2>
            <Button variant="secondary" icon={<ShuffleIcon />} disabled={lineup.length < 2} onClick={randomize}>
              Randomize
            </Button>
          </div>
          {lineup.length === 0 && (
            <p className="m-0 rounded-[20px] bg-surface px-4 py-5 text-center text-[15px] text-text-2">
              Tap players below to add them.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={lineup.map((x) => x.key)} strategy={verticalListSortingStrategy}>
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {lineup.map((p, i) => (
                  <SortableRow
                    key={p.key}
                    p={p}
                    first={i === 0}
                    firstLabel={game.template === 'rounds' ? 'Deals first' : 'Goes first'}
                    onOpen={() => setOptions(p.key)}
                    onTarget={(target) => update(p.key, { target })}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[17px] font-extrabold">Add players</h2>
          <div className="flex flex-wrap gap-2">
            {available.map((p) => (
              <AddChip key={p.id} player={p} disabled={full} onClick={() => add({ playerId: p.id, name: p.name, emoji: p.emoji, color: p.color })} />
            ))}
            <button
              type="button"
              disabled={full}
              onClick={() => setGuestOpen(true)}
              className="flex h-11 items-center gap-1.5 rounded-[22px] border-[1.5px] border-dashed border-text-2 px-3.5 text-[15px] font-bold text-text disabled:opacity-40"
            >
              <PlusIcon width={16} height={16} />
              <NoWrap>Guest</NoWrap>
            </button>
          </div>
          {saved?.length === 0 && (
            <p className="m-0 text-[14px] leading-snug text-text-2">Save regular players on the Players tab so their history builds up.</p>
          )}
          {full && <p className="m-0 text-[14px] text-text-2">{game.name} has room for {limits.max} players.</p>}
        </section>

        {lineup.length > 0 && lineup.length < normal.min && (
          <section className="flex items-center gap-3 rounded-2xl border-[1.5px] border-border px-3.5 py-2">
            <div className="flex flex-1 flex-col">
              <span className="text-[15px] font-extrabold">Play anyway</span>
              <span className="text-[13px] leading-snug text-text-2">
                {game.name} is for {normal.min}–{normal.max} players.
              </span>
            </div>
            <Toggle label="Play anyway" checked={override} onChange={setOverride} />
          </section>
        )}
      </main>

      <BottomToolbar>
        <Button size="lg" className="flex-1" icon={<PlayIcon />} disabled={!canStart} onClick={start}>
          Start game
        </Button>
      </BottomToolbar>

      {optionsFor && (
        <Sheet title={optionsFor.name} onClose={() => setOptions(null)}>
          <div className="flex flex-col gap-5">
            {lineup[0]?.key !== optionsFor.key && (
              <Button
                variant="secondary"
                onClick={() => {
                  makeFirst(optionsFor.key);
                  setOptions(null);
                }}
              >
                {game.template === 'rounds' ? 'Deals first' : 'Goes first'}
              </Button>
            )}
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-[15px] font-extrabold">Color</h3>
              <div role="radiogroup" aria-label="Color" className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
                {game.pieceColors.map((c) => {
                  const taken = !freeColors(game.pieceColors, lineup.filter((x) => x.key !== optionsFor.key).map((x) => x.color)).includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={optionsFor.color === c}
                      aria-label={COLOR_NAME[c]}
                      disabled={taken}
                      onClick={() => update(optionsFor.key, { color: c })}
                      className="h-11 rounded-full disabled:opacity-20"
                      style={{
                        background: COLOR_HEX[c],
                        boxShadow:
                          optionsFor.color === c
                            ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)'
                            : c === 'black'
                              ? 'inset 0 0 0 1.5px var(--black-outline)'
                              : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </section>
            <Button
              variant="outline"
              onClick={() => {
                remove(optionsFor.key);
                setOptions(null);
              }}
            >
              Remove from game
            </Button>
          </div>
        </Sheet>
      )}

      {guestOpen && (
        <GuestSheet
          onClose={() => setGuestOpen(false)}
          onAdd={(name) => {
            add({ playerId: null, name, emoji: GUEST_EMOJI, color: game.pieceColors[0]! });
            setGuestOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SortableRow({
  p,
  first,
  firstLabel,
  onOpen,
  onTarget,
}: {
  p: SetupPlayer;
  first: boolean;
  firstLabel: string;
  onOpen: () => void;
  onTarget: (t: number | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.key });
  const sub = first ? firstLabel : p.color !== p.profileColor && p.playerId ? `Color changed: ${COLOR_NAME[p.color].toLowerCase()}` : undefined;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-center gap-0.5 ${isDragging ? 'opacity-90' : ''}`}
    >
      <button
        type="button"
        aria-label={`Drag ${p.name} to reorder`}
        className="-ml-1.5 flex h-11 w-11 shrink-0 touch-none items-center justify-center text-text-2"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <div className="relative min-w-0 flex-1">
        <button type="button" onClick={onOpen} aria-label={`${p.name} options`} className="w-full text-left">
          <PlayerPill name={p.name} emoji={p.emoji} color={p.color} sub={sub}>
            {p.target !== null && <span className="w-[104px] shrink-0" aria-hidden="true" />}
          </PlayerPill>
        </button>
        {p.target !== null && (
          // Outside the row button so typing doesn't open the options sheet.
          <label className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1.5 text-[13px] text-white">
            <NoWrap>Target</NoWrap>
            <input
              aria-label={`${p.name} target`}
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              value={p.target === 0 ? '' : String(p.target)}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 3);
                onTarget(d === '' ? 0 : Number(d));
              }}
              className="tabular h-11 w-[60px] rounded-[22px] bg-white text-center text-[17px] font-extrabold text-[#1F2430] outline-none"
            />
          </label>
        )}
      </div>
    </li>
  );
}

function AddChip({ player, disabled, onClick }: { player: Player; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 max-w-full items-center gap-1.5 rounded-[22px] border-[1.5px] border-border pr-3.5 pl-1.5 text-[15px] font-bold text-text disabled:opacity-40"
    >
      <span className="rounded-full" style={{ background: COLOR_HEX[player.color] }}>
        <Avatar emoji={player.emoji} size={30} />
      </span>
      <NoWrap truncate>{player.name}</NoWrap>
    </button>
  );
}

function GuestSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Sheet
      title="Add a guest"
      onClose={onClose}
      footer={
        <Button className="flex-1" disabled={!name.trim()} onClick={() => onAdd(name.trim())}>
          Add guest
        </Button>
      }
    >
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-bold text-text-2">Name</span>
        <input
          autoFocus
          value={name}
          maxLength={24}
          enterKeyHint="done"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onAdd(name.trim())}
          className="h-11 rounded-[14px] border-[1.5px] border-border bg-bg px-3 text-[17px] text-text outline-none focus:border-text"
        />
      </label>
      <p className="mt-2 mb-0 text-[13px] leading-snug text-text-2">Guests appear in this game's history but never in stats.</p>
    </Sheet>
  );
}
