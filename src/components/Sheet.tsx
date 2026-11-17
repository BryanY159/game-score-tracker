import { useEffect, useRef, type ReactNode } from 'react';
import { NoWrap } from './NoWrap';

/** Bottom sheet modal. Closes on backdrop tap or Escape. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  closeLabel = 'Cancel',
}: {
  closeLabel?: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="pb-safe flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[24px] bg-bg outline-none ring-1 ring-border md:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <NoWrap as="h2" truncate className="m-0 flex-1 text-[22px] font-extrabold">
            {title}
          </NoWrap>
          <button
            type="button"
            onClick={onClose}
            className="h-11 shrink-0 rounded-[22px] bg-surface px-4 text-[15px] font-extrabold text-text"
          >
            <NoWrap>{closeLabel}</NoWrap>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-border px-5 pt-3 pb-3">{footer}</div>}
      </div>
    </div>
  );
}
