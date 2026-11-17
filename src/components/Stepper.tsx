import { MinusIcon, PlusIcon } from './Icons';

/** +/− stepper for small counts (FR-18 AC-1), on a neutral background. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-text text-text disabled:opacity-30"
      >
        <MinusIcon width={18} height={18} />
      </button>
      <span className="tabular w-8 text-center text-xl font-extrabold" aria-label={`${value} ${label}`}>
        {value}
      </span>
      <button
        type="button"
        aria-label={`More ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-btn text-btn-text disabled:opacity-30"
      >
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}
