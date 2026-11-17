import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { NoWrap } from './NoWrap';

type Variant = 'primary' | 'secondary' | 'outline';

const VARIANTS: Record<Variant, string> = {
  // Buttons are neutral charcoal and never look like a player pill (CLAUDE.md).
  primary: 'bg-btn text-btn-text',
  secondary: 'bg-surface text-text',
  outline: 'border-[1.5px] border-text text-text bg-transparent',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: ReactNode;
}) {
  const sizing = size === 'lg' ? 'h-16 rounded-[20px] text-xl px-6' : 'h-11 rounded-[22px] text-[15px] px-[18px]';
  return (
    <button
      type="button"
      className={`inline-flex min-w-11 items-center justify-center gap-2.5 font-extrabold disabled:opacity-40 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children !== undefined && <NoWrap>{children}</NoWrap>}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
