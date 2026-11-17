import { useState } from 'react';
import { NoWrap } from '../../components/NoWrap';
import { Sheet } from '../../components/Sheet';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import type { TurnLogEntry } from '../../domain/types';
import { allowedRouteLengths, ROUTE_LENGTHS, ROUTE_POINTS } from './scoring';

export function describeTurn(e: TurnLogEntry, name: string): { text: string; points: string } {
  if (e.action === 'route') return { text: `${name} claimed a ${e.routeLength}-route`, points: `+${ROUTE_POINTS[e.routeLength!] ?? 0}` };
  return { text: e.action === 'drawTrains' ? `${name} drew train cards` : `${name} drew tickets`, points: '' };
}

/** FR-7 AC-4: the turn log, newest first; any turn can be changed. */
export function TurnLogSheet({
  seats,
  turns,
  onEdit,
  onClose,
}: {
  seats: Seat[];
  turns: TurnLogEntry[];
  onEdit: (index: number, change: Pick<TurnLogEntry, 'action' | 'routeLength'>) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const seatOf = (id: string) => seats.find((s) => s.player.id === id)!;
  const ids = seats.map((s) => s.player.id);

  if (editing !== null) {
    const e = turns[editing]!;
    const allowed = allowedRouteLengths(ids, turns, editing);
    const pick = (change: Pick<TurnLogEntry, 'action' | 'routeLength'>) => {
      onEdit(editing, change);
      setEditing(null);
    };
    return (
      <Sheet title={`Turn ${editing + 1} · ${seatOf(e.playerId).player.name}`} closeLabel="Back" onClose={() => setEditing(null)}>
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[14px] text-text-2">What happened on this turn? Totals and the final round are worked out again.</p>
          <div className="grid grid-cols-3 gap-2">
            {ROUTE_LENGTHS.map((len) => (
              <button
                key={len}
                type="button"
                disabled={!allowed.includes(len)}
                aria-pressed={e.action === 'route' && e.routeLength === len}
                onClick={() => pick({ action: 'route', routeLength: len })}
                aria-label={`${len}-route`}
                className="flex h-[60px] flex-col items-center justify-center rounded-2xl border-[1.5px] border-text leading-tight text-text disabled:opacity-30 aria-pressed:bg-text aria-pressed:text-bg"
              >
                <span className="tabular text-[22px] font-extrabold">{len}</span>
                <NoWrap className="text-[13px]">
                  {ROUTE_POINTS[len]} {ROUTE_POINTS[len] === 1 ? 'pt' : 'pts'}
                </NoWrap>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => pick({ action: 'drawTrains' })} className="h-[52px] rounded-2xl bg-surface text-[15px] font-bold text-text">
              <NoWrap>Drew train cards</NoWrap>
            </button>
            <button type="button" onClick={() => pick({ action: 'drawTickets' })} className="h-[52px] rounded-2xl bg-surface text-[15px] font-bold text-text">
              <NoWrap>Drew tickets</NoWrap>
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Turn log" closeLabel="Close" onClose={onClose}>
      {turns.length === 0 ? (
        <p className="m-0 text-[15px] text-text-2">No turns yet.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0" aria-label="Turns">
          {[...turns].map((e, i) => ({ e, i })).reverse().map(({ e, i }) => {
            const s = seatOf(e.playerId);
            const d = describeTurn(e, s.player.name);
            return (
              <li key={i} className="border-b border-border last:border-b-0">
                <button type="button" onClick={() => setEditing(i)} aria-label={`Turn ${i + 1}: ${d.text}`} className="flex min-h-12 w-full items-center gap-3 text-left text-text">
                  <NoWrap className="tabular w-8 shrink-0 text-[13px] text-text-2">{i + 1}</NoWrap>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLOR_HEX[s.mp.color] }} />
                  <NoWrap truncate className="flex-1 text-[15px]">
                    {d.text}
                  </NoWrap>
                  <NoWrap className="tabular text-[15px] font-bold">{d.points}</NoWrap>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Sheet>
  );
}
