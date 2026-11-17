import { Button } from './Button';
import { isEscape, useShortcuts } from '../hooks/useShortcuts';

/** Centered confirmation, used for destructive actions (delete, cancel game). */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useShortcuts(title, [{ keys: 'Esc', label: 'Keep', match: isEscape, run: onCancel, whileTyping: true }], { modal: true });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-sm flex-col gap-3 rounded-[24px] bg-bg p-5 ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 text-xl font-extrabold">{title}</h2>
        <p className="m-0 text-[15px] leading-snug text-text-2">{body}</p>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Keep
          </Button>
          <Button className="flex-1" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
