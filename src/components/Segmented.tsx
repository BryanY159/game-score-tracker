import { NoWrap } from './NoWrap';

/** Two or more mutually exclusive options in a pill track. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-[14px] bg-surface p-[3px]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-11 rounded-[11px] px-3 text-[14px] ${
            value === o.value ? 'bg-bg font-extrabold text-text shadow-sm' : 'font-bold text-text-2'
          }`}
        >
          <NoWrap>{o.label}</NoWrap>
        </button>
      ))}
    </div>
  );
}
