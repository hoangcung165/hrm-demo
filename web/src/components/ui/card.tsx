// Library component "Card" (pattern P4): a titled section of a page on the `surface-muted` canvas,
// with an optional footer for its actions. Below md it is the library's `compact` variant.
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export type CardProps = {
  /** Rendered as an `h2`; omitted for a `bare` card. */
  title?: string;
  /** One line under the title. */
  description?: string;
  children: ReactNode;
  /** Footer buttons: secondary first, then the single primary. */
  actions?: ReactNode;
  /** Footer metadata on the left, e.g. "Cập nhật lần cuối 09:30 · 04/10/2026". */
  meta?: ReactNode;
  /** Loading: `aria-busy`, and a Skeleton instead of the title. Needs `label`. */
  busy?: boolean;
  /** Accessible name when there is no title (loading). */
  label?: string;
  /** No head, body padding or footer: the card holds one State block. */
  bare?: boolean;
  className?: string;
};

export function Card({ title, description, children, actions, meta, busy = false, label, bare = false, className }: CardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title && !bare ? titleId : undefined}
      aria-label={title && !bare ? undefined : label}
      aria-busy={busy || undefined}
      className={cn('rounded-md border border-line bg-surface', className)}
    >
      {bare ? (
        children
      ) : (
        <>
          <div className="flex flex-col gap-1 px-4 pt-4 md:px-6 md:pt-6">
            {title ? (
              <h2 id={titleId} className="text-heading">
                {title}
              </h2>
            ) : busy ? (
              <Skeleton shape="title" className="w-40" />
            ) : null}
            {description ? <p className="text-ink-muted">{description}</p> : null}
          </div>
          <div className="flex flex-col gap-4 p-4 md:p-6">{children}</div>
          {actions || meta ? (
            // Compact: column-reverse puts the primary (last in the DOM) on top and the metadata last.
            <div className="flex flex-col-reverse items-stretch gap-2 border-t border-line p-4 md:flex-row md:items-center md:justify-end md:px-6 [&_button]:h-11 md:[&_button]:h-10">
              {meta ? <span className="-order-1 text-caption text-ink-muted md:order-none md:mr-auto">{meta}</span> : null}
              {actions}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
