import { HoldButton } from './HoldButton';
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
      <HoldButton
        aria-label={`Fewer ${label}`}
        canStep={value > min}
        onStep={() => onChange(value - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-text text-text disabled:opacity-30"
      >
        <MinusIcon width={18} height={18} />
      </HoldButton>
      <span className="tabular w-8 text-center text-xl font-extrabold" aria-label={`${value} ${label}`}>
        {value}
      </span>
      <HoldButton
        aria-label={`More ${label}`}
        canStep={value < max}
        onStep={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-btn text-btn-text disabled:opacity-30"
      >
        <PlusIcon width={18} height={18} />
      </HoldButton>
    </div>
  );
}
