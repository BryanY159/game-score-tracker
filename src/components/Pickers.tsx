import { COLOR_HEX, COLOR_NAME, PALETTE } from '../domain/colors';
import type { PaletteColor } from '../domain/types';

export const EMOJIS = [
  '🦊', '🐢', '🌵', '🐙', '🦉', '🐳', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🐤', '🦄',
  '🐝', '🦋', '🐞', '🐬', '🦈', '🦖', '🐲', '🐱', '🐶', '🐰', '🦔', '🦩', '🌻', '🍄', '⭐', '🌈',
  '🔥', '⚡', '🍕', '🍩', '🎲', '🎯', '🚀', '🎸', '👑', '💎', '🍀', '🌙',
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Emoji" className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={value === e}
          aria-label={e}
          onClick={() => onChange(e)}
          className={`flex h-11 items-center justify-center rounded-[14px] text-2xl ${
            value === e ? 'bg-btn ring-2 ring-text' : 'bg-surface'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  colors = PALETTE,
  disabled = [],
}: {
  value: PaletteColor;
  onChange: (c: PaletteColor) => void;
  colors?: PaletteColor[];
  disabled?: PaletteColor[];
}) {
  return (
    <div role="radiogroup" aria-label="Color" className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={COLOR_NAME[c]}
          disabled={disabled.includes(c)}
          onClick={() => onChange(c)}
          className="flex h-11 items-center justify-center rounded-full disabled:opacity-25"
          style={{
            background: COLOR_HEX[c],
            boxShadow: value === c ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)' : undefined,
          }}
        >
          {value === c && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12l5 5L19 7" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[60px] shrink-0 items-center"
    >
      <span className={`relative block h-[31px] w-[51px] rounded-full transition-colors ${checked ? 'bg-text' : 'bg-border'}`}>
        <span
          className={`absolute top-0.5 left-0.5 block h-[27px] w-[27px] rounded-full shadow ${checked ? 'bg-bg' : 'bg-white'} transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}
