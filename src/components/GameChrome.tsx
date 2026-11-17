import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { elapsedMs, formatClock } from '../domain/timer';
import type { Match } from '../domain/types';
import { useNow } from '../hooks/useNow';
import { IconButton } from './Button';
import { BackIcon } from './Icons';
import { NoWrap } from './NoWrap';

/** Header for game screens: back, title over subtitle, optional trailing item (timer). */
export function GameHeader({
  title,
  sub,
  trailing,
  backTo = '/',
  onBack,
}: {
  title: string;
  sub?: ReactNode;
  trailing?: ReactNode;
  backTo?: string | null;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        {backTo !== null && (
          <IconButton label="Back" onClick={() => (onBack ? onBack() : navigate(backTo))}>
            <BackIcon />
          </IconButton>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <NoWrap as="h1" truncate className="m-0 text-[22px] leading-tight font-extrabold">
            {title}
          </NoWrap>
          {sub !== undefined && (
            <NoWrap truncate className="text-[14px] text-text-2">
              {sub}
            </NoWrap>
          )}
        </div>
        {trailing}
      </div>
    </header>
  );
}

/** Running game clock (FR-3 AC-4), with the pause button as its child. */
export function TimerChip({ match, children }: { match: Match; children?: ReactNode }) {
  const running = match.endedAt === null && match.pausedAt === null;
  const now = useNow(1000, running);
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 rounded-[22px] bg-surface px-3.5">
      <span className="tabular text-base font-bold" aria-label="Game time">
        {formatClock(elapsedMs(match, now))}
      </span>
      {children}
    </div>
  );
}

/** Small icon-over-label toolbar action (Undo, Notes, More). */
export function ToolButton({
  icon,
  label,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className={`flex h-[52px] min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold text-text disabled:opacity-35 ${className}`}
      {...rest}
    >
      {icon}
      <NoWrap>{label}</NoWrap>
    </button>
  );
}

/** The main action in a game toolbar (Confirm round, Finalize...). */
export function PrimaryToolButton({
  children,
  icon,
  className = '',
  userText = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; /** Holds a player name, so it may truncate. */ userText?: boolean }) {
  return (
    <button
      type="button"
      className={`flex h-[52px] min-w-0 flex-[2] items-center justify-center gap-2 rounded-2xl bg-btn px-3 text-[17px] font-extrabold text-btn-text disabled:opacity-40 ${className}`}
      {...rest}
    >
      {icon}
      <NoWrap truncate={userText}>{children}</NoWrap>
    </button>
  );
}

/** Full-height column for game screens: header, scrolling body, fixed toolbar. */
export function GameScreen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">{children}</div>;
}

/** The scrolling body of a game screen; hosts the paused overlay. */
export function GameBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`relative flex flex-1 flex-col ${className}`}>{children}</main>;
}

/**
 * NFR-3 landscape (iPad with a keyboard): header across the top, players and
 * scoreboard on the left, the entry panel and toolbar on the right. Each pane
 * scrolls on its own; the paused overlay covers both.
 */
export function TwoPaneGame({
  header,
  left,
  right,
  toolbar,
  overlay,
  rightWidth = 460,
  after,
}: {
  header: ReactNode;
  left: ReactNode;
  right: ReactNode;
  toolbar: ReactNode;
  overlay?: ReactNode;
  /** The right pane's width in px; the left pane takes the rest. */
  rightWidth?: number;
  /** Sheets and dialogs. */
  after?: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden" data-layout="two-pane">
      {header}
      <div className="relative grid min-h-0 flex-1 gap-5 px-5" style={{ gridTemplateColumns: `minmax(0, 1fr) ${rightWidth}px` }}>
        {overlay}
        <main className="flex min-h-0 flex-col gap-2.5 overflow-y-auto pt-1 pb-5" aria-label="Scoreboard">
          {left}
        </main>
        <aside className="flex min-h-0 flex-col" aria-label="Entry">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-1 pb-3">{right}</div>
          {toolbar}
        </aside>
      </div>
      {after}
    </div>
  );
}

/** A compact standings row for the landscape left pane. */
export function ScoreRow({
  color,
  avatar,
  name,
  detail,
  value,
  valueLabel,
  now = false,
  dim = false,
}: {
  color: string;
  avatar: ReactNode;
  name: string;
  detail?: string;
  value: ReactNode;
  valueLabel: string;
  now?: boolean;
  dim?: boolean;
}) {
  return (
    <li className={`flex h-12 items-center gap-2.5 rounded-3xl pr-4 pl-1.5 text-white ${dim ? 'opacity-55' : ''}`} style={{ background: color }}>
      {avatar}
      <NoWrap truncate className="flex-1 text-base font-bold">
        {name}
      </NoWrap>
      {now && <NoWrap className="rounded-lg bg-white/22 px-2 text-[12px] font-bold">now</NoWrap>}
      {detail && <NoWrap className="text-[14px]">{detail}</NoWrap>}
      <NoWrap className="tabular min-w-10 text-right text-[20px] font-extrabold" aria-label={valueLabel}>
        {value}
      </NoWrap>
    </li>
  );
}
