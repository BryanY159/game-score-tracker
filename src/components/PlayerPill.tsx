import type { ReactNode } from 'react';
import { COLOR_HEX } from '../domain/colors';
import type { PlayerColor } from '../domain/types';
import { NoWrap } from './NoWrap';

/** A player row: white text on the player's color, with their emoji (spec §6). */
export function PlayerPill({
  name,
  emoji,
  color,
  sub,
  children,
}: {
  name: string;
  emoji: string;
  color: PlayerColor;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex h-14 items-center gap-2.5 rounded-[28px] pr-4 pl-2 text-white"
      style={{
        background: COLOR_HEX[color],
        boxShadow: color === 'black' ? 'inset 0 0 0 1.5px var(--black-outline)' : undefined,
      }}
    >
      <Avatar emoji={emoji} />
      <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
        <NoWrap truncate className="text-[17px] font-bold">
          {name}
        </NoWrap>
        {sub !== undefined && (
          <NoWrap truncate className="text-[13px]">
            {sub}
          </NoWrap>
        )}
      </div>
      {children}
    </div>
  );
}

export function Avatar({ emoji, size = 40 }: { emoji: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-white/22"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {emoji}
    </span>
  );
}
