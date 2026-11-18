import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/schema';
import { cancelMatch, pauseMatch, resumeMatch } from '../db/repos/matches';
import type { Match } from '../domain/types';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { PauseIcon, PlayIcon } from './Icons';
import { NoWrap } from './NoWrap';
import { cmd, isEscape, isTypingTarget, key, useShortcuts, type Shortcut } from '../hooks/useShortcuts';

/**
 * Shared game controls: Cancel (FR-5 AC-3: straight to the confirmation) and
 * Back (AC-2). Notes were removed on 2026-11-18; stored notes are kept, unused.
 */
export function useGameControls(match: Match) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  /** Back (AC-2): pause, return Home; the game stays under In Progress. */
  const exitToHome = async () => {
    await pauseMatch(db, match.id);
    navigate('/', { replace: true });
  };

  const element = cancelling && (
    <ConfirmDialog
      title="Cancel this game?"
      body="It will be discarded and won't appear in history."
      confirmLabel="Discard"
      onCancel={() => setCancelling(false)}
      onConfirm={async () => {
        await cancelMatch(db, match.id);
        navigate('/', { replace: true });
      }}
    />
  );

  return { element, openCancel: () => setCancelling(true), exitToHome };
}

/** The pause button inside the timer chip. */
export function PauseButton({ match }: { match: Match }) {
  const paused = match.pausedAt !== null;
  return (
    <button
      type="button"
      aria-label={paused ? 'Resume' : 'Pause'}
      onClick={() => (paused ? resumeMatch(db, match.id) : pauseMatch(db, match.id))}
      // 34px visual dot inside a 44px target (NFR-3).
      className="-my-1 -mr-2.5 flex h-11 w-11 items-center justify-center"
    >
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-btn text-btn-text">
        {paused ? <PlayIcon width={14} height={14} /> : <PauseIcon />}
      </span>
    </button>
  );
}

/** Covers the scoring area while paused, so no entry slips in by accident. */
export function PausedOverlay({ match }: { match: Match }) {
  if (match.pausedAt === null) return null;
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg/90 px-6 text-center backdrop-blur-sm">
      <NoWrap as="p" className="m-0 text-[26px] font-extrabold">
        Paused
      </NoWrap>
      <p className="m-0 text-[15px] text-text-2">The clock is stopped. Paused time isn't counted.</p>
      <Button size="lg" icon={<PlayIcon />} onClick={() => resumeMatch(db, match.id)}>
        Resume
      </Button>
    </div>
  );
}

/**
 * FR-20 AC-1 on a game screen: ⌘Z Undo, Space pause or resume, Esc back (it
 * pauses, like the back arrow). `keys` are the game's own (AC-2 to AC-4).
 * Esc in a text field leaves the field first.
 */
export function useGameShortcuts(
  title: string,
  match: Match,
  { back, undo, keys = [] }: { back: () => void; undo?: { run: () => void; enabled: boolean }; keys?: Shortcut[] },
) {
  const paused = match.pausedAt !== null;
  useShortcuts(title, [
    ...keys,
    ...(undo ? [{ keys: '⌘Z', label: 'Undo', match: cmd('z'), run: undo.run, enabled: undo.enabled && !paused }] : []),
    {
      keys: 'Space',
      label: paused ? 'Resume' : 'Pause',
      match: key(' '),
      run: () => void (paused ? resumeMatch(db, match.id) : pauseMatch(db, match.id)),
      enabled: match.endedAt === null,
    },
    {
      keys: 'Esc',
      label: 'Back (pauses the game)',
      match: isEscape,
      whileTyping: true,
      run: () => {
        const el = document.activeElement;
        if (isTypingTarget(el)) (el as HTMLElement).blur();
        else back();
      },
    },
  ]);
}
