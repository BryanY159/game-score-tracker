import type { ReactNode } from 'react';
import { COLOR_HEX } from '../domain/colors';
import type { PlayerColor } from '../domain/types';
import { CrownIcon } from './Icons';
import { NoWrap } from './NoWrap';

export interface PodiumEntry {
  key: string;
  name: string;
  emoji: string;
  color: PlayerColor;
  /** Finishing place shown on the step (two players can share 1st). */
  place: number;
  /** Which step they stand on: 1 centre, 2 left, 3 right. */
  step: 1 | 2 | 3;
  primary?: ReactNode;
  secondary?: ReactNode;
}

const HEIGHTS: Record<number, number> = { 1: 180, 2: 130, 3: 100 };

/** Top three in player colors: 2nd, 1st, 3rd (FR-12 AC-1). Animation comes with the motion milestone. */
export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const byPlace = [2, 1, 3]
    .map((step) => entries.find((e) => e.step === step))
    .filter((e): e is PodiumEntry => !!e);
  return (
    <div className="flex items-end gap-2.5 px-5 pt-6" role="list" aria-label="Podium">
      {byPlace.map((e) => {
        const first = e.step === 1;
        return (
          <div key={e.key} role="listitem" className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {e.place === 1 && (
              <span className="crown-pop" style={{ animationDelay: '900ms' }}>
                <CrownIcon role="img" aria-label="Winner" />
              </span>
            )}
            <span
              aria-hidden="true"
              className="flex items-center justify-center rounded-full bg-surface"
              style={{ width: first ? 60 : 52, height: first ? 60 : 52, fontSize: first ? 32 : 28 }}
            >
              {e.emoji}
            </span>
            <NoWrap truncate className={`max-w-full ${first ? 'text-[17px] font-extrabold' : 'text-base font-bold'}`}>
              {e.name}
            </NoWrap>
            <div
              className="podium-rise flex w-full flex-col items-center gap-0.5 rounded-t-[20px] rounded-b-lg pt-3 text-white"
              style={{
                height: HEIGHTS[e.step],
                // The 3rd step rises first and the winner's last (FR-12 AC-1).
                animationDelay: `${({ 3: 0, 2: 200, 1: 400 } as Record<number, number>)[e.step]}ms`,
                background: COLOR_HEX[e.color],
                boxShadow: e.color === 'black' ? 'inset 0 0 0 1.5px var(--black-outline)' : undefined,
              }}
            >
              <span className={`tabular font-extrabold ${first ? 'text-4xl' : 'text-3xl'}`}>{e.place}</span>
              {e.primary !== undefined && (
                <NoWrap className={`tabular font-extrabold ${first ? 'text-xl' : 'text-lg'}`}>{e.primary}</NoWrap>
              )}
              {e.secondary !== undefined && <NoWrap className="text-[13px]">{e.secondary}</NoWrap>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
