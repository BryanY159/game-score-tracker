import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Keypad } from '../../components/Keypad';
import { NoWrap } from '../../components/NoWrap';
import { Avatar } from '../../components/PlayerPill';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { LONGEST_PATH_BONUS, ttrTotal, type TtrFinal } from './scoring';
import { digitOf, key, useShortcuts } from '../../hooks/useShortcuts';

/**
 * FR-7 AC-6, AC-7: each player's destination tickets (completed +value, failed
 * −value) and the longest path (+10 each; pick everyone who ties).
 */
export function FinalForm({
  seats,
  finals,
  playerId,
  onSelect,
  onChange,
  routePointsEditable = false,
}: {
  seats: Seat[];
  finals: Record<string, TtrFinal>;
  playerId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, f: TtrFinal) => void;
  /** Editing a finished game: the turn log is gone, so route points are typed (A-11). */
  routePointsEditable?: boolean;
}) {
  // null: closed; a number: open, starting from that digit typed on the keyboard.
  const [adding, setAdding] = useState<null | { first: number | null }>(null);
  const seat = seats.find((s) => s.player.id === playerId)!;
  const f = finals[playerId]!;
  const at = seats.findIndex((s) => s.player.id === playerId);
  // FR-20 AC-3, end-of-game scoring.
  useShortcuts(`Final scoring: ${seat.player.name}`, [
    { keys: '0–9', label: 'Type a ticket value', match: (e) => digitOf(e) !== null, run: (e) => setAdding({ first: digitOf(e) || null }) },
    { keys: 'Enter', label: 'Add the next ticket', match: key('Enter'), run: () => setAdding({ first: null }) },
    { keys: 'P', label: `Longest path for ${seat.player.name}`, match: key('p'), run: () => onChange(playerId, { ...f, longestPath: !f.longestPath }) },
    { keys: '← →', label: 'Previous or next player', match: (e) => key('ArrowLeft')(e) || key('ArrowRight')(e), run: (e) => {
      const to = seats[at + (e.key === 'ArrowLeft' ? -1 : 1)];
      if (to) onSelect(to.player.id);
    } },
  ]);
  const ticketSum = f.tickets.reduce((a, t) => a + (t.completed ? t.value : -t.value), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Players">
        {seats.map((s) => (
          <button
            key={s.mp.id}
            type="button"
            role="tab"
            aria-selected={s.player.id === playerId}
            onClick={() => onSelect(s.player.id)}
            className={`flex h-11 items-center gap-1.5 rounded-[22px] pr-3.5 pl-1.5 text-[15px] font-bold ${
              s.player.id === playerId ? 'bg-btn text-btn-text' : 'border-[1.5px] border-border text-text'
            }`}
          >
            <span className="rounded-full" style={{ background: COLOR_HEX[s.mp.color] }}>
              <Avatar emoji={s.player.emoji} size={30} />
            </span>
            <NoWrap truncate>{s.player.name}</NoWrap>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-[24px] px-4 py-3 text-white" style={{ background: COLOR_HEX[seat.mp.color] }}>
        <NoWrap truncate className="flex-1 text-[19px] font-extrabold">
          {seat.player.name}
        </NoWrap>
        {routePointsEditable ? (
          <label className="flex items-center gap-2 text-[14px]">
            <NoWrap>Route points</NoWrap>
            <input
              aria-label={`${seat.player.name} route points`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={f.routePoints}
              onChange={(e) => onChange(playerId, { ...f, routePoints: Number(e.target.value.replace(/\D/g, '').slice(0, 3) || 0) })}
              className="tabular h-11 w-[68px] rounded-[22px] bg-white text-center text-lg font-extrabold text-[#1F2430] outline-none"
            />
          </label>
        ) : (
          <NoWrap className="text-[15px]">
            route points <span className="tabular text-xl font-extrabold">{f.routePoints}</span>
          </NoWrap>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-[17px] font-extrabold">Destination tickets</h2>
        {f.tickets.length === 0 && <p className="m-0 text-[14px] text-text-2">No tickets yet.</p>}
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Tickets">
          {f.tickets.map((t, i) => (
            <li key={i} className="flex items-center gap-2 rounded-2xl border-[1.5px] border-border py-1 pr-1 pl-3">
              <NoWrap className="tabular w-9 text-xl font-extrabold">{t.value}</NoWrap>
              <div className="min-w-0 flex-1">
                <Segmented
                  label={`Ticket ${t.value}`}
                  value={t.completed ? 'done' : 'failed'}
                  onChange={(v) => onChange(playerId, { ...f, tickets: f.tickets.map((x, j) => (j === i ? { ...x, completed: v === 'done' } : x)) })}
                  options={[
                    { value: 'done', label: `Done +${t.value}` },
                    { value: 'failed', label: `Failed −${t.value}` },
                  ]}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ticket ${t.value}`}
                onClick={() => onChange(playerId, { ...f, tickets: f.tickets.filter((_, j) => j !== i) })}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={() => setAdding({ first: null })}>
          Add ticket
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-[17px] font-extrabold">Longest path +{LONGEST_PATH_BONUS}</h2>
          <NoWrap className="text-[13px] text-text-2">Pick all who tie</NoWrap>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Longest path">
          {seats.map((s) => {
            const on = finals[s.player.id]!.longestPath;
            return (
              <button
                key={s.mp.id}
                type="button"
                aria-pressed={on}
                aria-label={`Longest path: ${s.player.name}`}
                onClick={() => onChange(s.player.id, { ...finals[s.player.id]!, longestPath: !on })}
                className={`flex h-11 items-center gap-1.5 rounded-[22px] px-3.5 text-[15px] font-bold ${on ? 'text-white' : 'border-[1.5px] border-border text-text'}`}
                style={on ? { background: COLOR_HEX[s.mp.color] } : undefined}
              >
                <NoWrap truncate>{s.player.name}</NoWrap>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3">
        <NoWrap className="tabular text-[15px] text-text-2" aria-label="Breakdown">
          {f.routePoints} {ticketSum >= 0 ? '+' : '−'} {Math.abs(ticketSum)}
          {f.longestPath ? ` + ${LONGEST_PATH_BONUS}` : ''}
        </NoWrap>
        <NoWrap className="tabular text-2xl font-extrabold" aria-label={`${seat.player.name} final total`}>
          {ttrTotal(f)}
        </NoWrap>
      </div>

      {adding && (
        <AddTicket
          first={adding.first}
          name={seat.player.name}
          tickets={f.tickets}
          onClose={() => setAdding(null)}
          onAdd={(value, completed) => onChange(playerId, { ...f, tickets: [...f.tickets, { value, completed }] })}
          onRemove={(i) => onChange(playerId, { ...f, tickets: f.tickets.filter((_, j) => j !== i) })}
        />
      )}
    </div>
  );
}

/**
 * FR-7 AC-6: back-to-back ticket entry. Type a value, then Completed or Failed adds it and
 * clears the value for the next one; the sheet stays open and lists this player's tickets with
 * a running total. Only Done, a tap outside, or Esc closes it.
 */
function AddTicket({
  first,
  name,
  tickets,
  onAdd,
  onRemove,
  onClose,
}: {
  first: number | null;
  name: string;
  tickets: TtrFinal['tickets'];
  onAdd: (v: number, completed: boolean) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<number | null>(first);
  const add = (completed: boolean) => {
    if (!value) return;
    onAdd(value, completed);
    setValue(null);
  };
  const text = value === null ? '' : String(value);
  const sum = tickets.reduce((a, t) => a + (t.completed ? t.value : -t.value), 0);
  // Keep the newest ticket in view.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [tickets.length]);
  // FR-20 AC-3: digits type; C or X adds as completed or failed; Enter adds as completed,
  // or closes when nothing is typed. All of them keep the sheet open for the next ticket.
  useShortcuts('Add tickets', [
    { keys: '0–9', label: 'Type the value', match: (e) => digitOf(e) !== null, run: (e) => text.length < 2 && setValue(Number((text === '0' ? '' : text) + digitOf(e))) },
    { keys: 'Delete', label: 'Delete a digit', match: key('Backspace'), run: () => setValue(text.length > 1 ? Number(text.slice(0, -1)) : null) },
    { keys: 'C', label: 'Add it as completed', match: key('c'), run: () => add(true), enabled: !!value },
    { keys: 'X', label: 'Add it as failed', match: key('x'), run: () => add(false), enabled: !!value },
    { keys: 'Enter', label: 'Add it as completed, or Done when empty', match: key('Enter'), whileTyping: true, run: () => (value ? add(true) : onClose()) },
  ]);
  return (
    <Sheet title="Add ticket" closeLabel="Done" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <section className="flex flex-col gap-1.5" aria-label={`${name}'s tickets`}>
          <div className="flex items-baseline justify-between px-1">
            <NoWrap truncate className="text-[15px] font-extrabold">
              {name}'s tickets
            </NoWrap>
            <NoWrap className="tabular text-[15px] font-extrabold" aria-label="Tickets total">
              {sum >= 0 ? `+${sum}` : `−${Math.abs(sum)}`}
            </NoWrap>
          </div>
          {/* A fixed height that scrolls: the keypad below stays put as tickets are added. */}
          <div ref={listRef} className="h-[140px] overflow-y-auto overscroll-contain" data-testid="ticket-list">
          {tickets.length === 0 ? (
            <p className="m-0 px-1 pt-1 text-[14px] text-text-2">No tickets yet.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {tickets.map((t, i) => (
                <li key={i} className="flex h-11 items-center gap-2 rounded-2xl bg-surface pr-0.5 pl-3.5">
                  <NoWrap className="tabular w-10 text-[17px] font-extrabold">{t.completed ? `+${t.value}` : `−${t.value}`}</NoWrap>
                  <NoWrap className="flex-1 text-[14px] text-text-2">{t.completed ? 'Completed' : 'Failed'}</NoWrap>
                  <button
                    type="button"
                    aria-label={`Remove ${t.completed ? 'completed' : 'failed'} ticket ${t.value}`}
                    onClick={() => onRemove(i)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>
        <Keypad label="Ticket value" value={value} maxDigits={2} onChange={setValue} bare />
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={!value} onClick={() => add(true)}>
            {value ? `Completed +${value}` : 'Completed'}
          </Button>
          <Button variant="outline" disabled={!value} onClick={() => add(false)}>
            {value ? `Failed −${value}` : 'Failed'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
