import type { ElementType, HTMLAttributes } from 'react';

/**
 * A short label that must never wrap (NFR-6). `truncate` is the last resort:
 * one line with an ellipsis. Screenshot tests check every [data-nowrap].
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
      className={`whitespace-nowrap ${truncate ? 'min-w-0 truncate' : ''} ${className}`}
      {...rest}
    />
  );
}
