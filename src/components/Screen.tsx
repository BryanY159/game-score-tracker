import type { ReactNode } from 'react';

/** Page header in the mockup style: big title, optional trailing action. */
export function ScreenHeader({ title, trailing, leading }: { title: ReactNode; trailing?: ReactNode; leading?: ReactNode }) {
  return (
    <header className="pt-safe">
      <div className="flex min-h-[68px] items-center gap-3 px-5 pt-4 pb-3">
        {leading}
        <h1 data-nowrap="" className="m-0 min-w-0 flex-1 truncate text-[30px] leading-tight font-extrabold whitespace-nowrap">
          {title}
        </h1>
        {trailing}
      </div>
    </header>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center gap-2 rounded-[20px] bg-surface px-6 py-10 text-center">
      <p data-nowrap="" className="m-0 text-[17px] font-extrabold whitespace-nowrap">
        {title}
      </p>
      <p className="m-0 max-w-xs text-[15px] leading-snug text-text-2">{body}</p>
    </div>
  );
}
