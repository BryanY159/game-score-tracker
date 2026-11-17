import type { ElementType, HTMLAttributes } from 'react';

/**
 * A short label that must never wrap (NFR-6). `truncate` is the last resort,
 * for text people type (player names, notes): one line with an ellipsis.
 * Fixed UI labels never truncate; the layout check fails if one does.
 */
export function NoWrap({
  as: Tag = 'span',
  truncate = false,
  className = '',
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: ElementType; truncate?: boolean }) {
  return (
    <Tag
      data-nowrap=""
      data-user-text={truncate ? '' : undefined}
      className={`whitespace-nowrap ${truncate ? 'min-w-0 truncate' : ''} ${className}`}
      {...rest}
    />
  );
}
