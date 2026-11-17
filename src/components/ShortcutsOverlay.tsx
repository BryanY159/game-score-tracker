import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { activeLayers, isKeyboardFocusedControl, isTypingTarget, resolve, ShortcutContext, type Layer, type ShortcutRegistry } from '../hooks/useShortcuts';
import { NoWrap } from './NoWrap';
import { Sheet } from './Sheet';

/** FR-20: the app's one keyboard listener, and the ? overlay (AC-6). */
export function ShortcutProvider({ children }: { children: ReactNode }) {
  const layers = useRef<Layer[]>([]);
  const nextId = useRef(1);
  // A snapshot of the live layers when the overlay opened; null when it's closed.
  const [overlay, setOverlay] = useState<Layer[] | null>(null);

  const reg = useMemo<ShortcutRegistry>(
    () => ({
      push: (title, shortcuts, modal) => {
        const id = nextId.current++;
        layers.current = [...layers.current, { id, title, shortcuts, modal }];
        return id;
      },
      update: (id, title, shortcuts) => {
        layers.current = layers.current.map((l) => (l.id === id ? { ...l, title, shortcuts } : l));
      },
      pop: (id) => {
        layers.current = layers.current.filter((l) => l.id !== id);
      },
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return;
      const typing = isTypingTarget(e.target);
      if ((e.key === ' ' || e.key === 'Enter') && isKeyboardFocusedControl(e.target)) return;
      if (!typing && e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const snap = activeLayers(layers.current).filter((l) => l.shortcuts.some((s) => s.listed !== false));
        setOverlay((o) => (o ? null : snap));
        return;
      }
      const s = resolve(layers.current, e, typing);
      if (!s) return;
      // The app's action wins over the browser's (Space scrolling, ⌘Z).
      e.preventDefault();
      s.run(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ShortcutContext.Provider value={reg}>
      {children}
      {overlay && <ShortcutsOverlay layers={overlay} onClose={() => setOverlay(null)} />}
    </ShortcutContext.Provider>
  );
}

function ShortcutsOverlay({ layers, onClose }: { layers: Layer[]; onClose: () => void }) {
  return (
    <Sheet title="Keyboard shortcuts" closeLabel="Close" onClose={onClose}>
      <div className="flex flex-col gap-4" aria-label="Active shortcuts">
        {layers.length === 0 && <p className="m-0 text-[15px]">No shortcuts on this screen.</p>}
        {[...layers].reverse().map((l) => (
          <section key={l.id} className="flex flex-col gap-1.5">
            <h3 className="m-0 text-[15px] font-extrabold">{l.title}</h3>
            <dl className="m-0 grid grid-cols-[minmax(0,auto)_1fr] items-center gap-x-3 gap-y-1.5">
              {l.shortcuts
                .filter((s) => s.listed !== false)
                .map((s) => (
                  <div key={s.keys + s.label} className="contents">
                    <dt>
                      <kbd className="tabular inline-block rounded-lg border-[1.5px] border-border bg-surface px-2 py-0.5 font-[inherit] text-[14px] font-bold">
                        <NoWrap>{s.keys}</NoWrap>
                      </kbd>
                    </dt>
                    <dd className="m-0 text-[15px] leading-snug">{s.label}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
        <p className="m-0 text-[13px] text-text-2">Press ? to show or hide this list. Esc or ⌘. closes it.</p>
      </div>
    </Sheet>
  );
}
