import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/schema';
import { cancelMatch, pauseMatch, resumeMatch, setNotes } from '../db/repos/matches';
import type { Match } from '../domain/types';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { PauseIcon, PlayIcon } from './Icons';
import { NoWrap } from './NoWrap';
import { Sheet } from './Sheet';

type Open = null | 'more' | 'notes' | 'cancel';

/**
 * Shared game controls: More (Save and exit, Cancel), Notes, and Pause.
 * FR-5 AC-1 to AC-3 and AC-6.
 */
export function useGameControls(match: Match) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Open>(null);

  /** Save and Exit (AC-2): the game stays under In Progress, paused so time away doesn't count. */
  const saveAndExit = async () => {
    await pauseMatch(db, match.id);
    navigate('/', { replace: true });
  };

  const element = (
    <>
      {open === 'more' && (
        <Sheet title="Game options" closeLabel="Close" onClose={() => setOpen(null)}>
          <div className="flex flex-col gap-2">
            <Button onClick={saveAndExit}>Save and exit</Button>
            <Button variant="outline" onClick={() => setOpen('cancel')}>
              Cancel game
            </Button>
          </div>
        </Sheet>
      )}
      {open === 'cancel' && (
        <ConfirmDialog
          title="Cancel this game?"
          body="It will be discarded and won't appear in history."
          confirmLabel="Discard"
          onCancel={() => setOpen(null)}
          onConfirm={async () => {
            await cancelMatch(db, match.id);
            navigate('/', { replace: true });
          }}
        />
      )}
      {open === 'notes' && <NotesSheet match={match} onClose={() => setOpen(null)} />}
    </>
  );

  return {
    element,
    openMore: () => setOpen('more'),
    openNotes: () => setOpen('notes'),
    saveAndExit,
  };
}

export function NotesSheet({ match, onClose }: { match: Match; onClose: () => void }) {
  const [text, setText] = useState(match.notes);
  const latest = useRef(text);
  // Save as you type (debounced) and once more on close, so nothing is lost.
  useEffect(() => {
    latest.current = text;
    const t = setTimeout(() => void setNotes(db, match.id, text), 400);
    return () => clearTimeout(t);
  }, [text, match.id]);
  const close = async () => {
    await setNotes(db, match.id, latest.current);
    onClose();
  };
  return (
    <Sheet title="Notes" closeLabel="Close" onClose={close} footer={<Button className="flex-1" onClick={close}>Done</Button>}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="House rules, who brought snacks, anything worth remembering."
        rows={6}
        className="w-full resize-none rounded-[14px] border-[1.5px] border-border bg-bg p-3 text-[17px] leading-snug text-text outline-none placeholder:text-text-2 focus:border-text"
      />
    </Sheet>
  );
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
