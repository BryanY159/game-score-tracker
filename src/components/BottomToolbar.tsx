import type { ReactNode } from 'react';

/** Fixed bottom toolbar holding a screen's main actions (spec §6). */
export function BottomToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="pb-safe sticky bottom-0 z-10 border-t border-border bg-bg">
      <div className="flex items-center gap-2 px-3 pt-2 pb-2">{children}</div>
    </div>
  );
}
