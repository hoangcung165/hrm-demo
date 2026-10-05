// Library component "Person" (Avatar README): Avatar + name on one line, with an optional caption line.
// `vacant` is the "nobody assigned" state: dashed Avatar and muted text.
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';

export type PersonProps = {
  /** Full name, or the vacant text ("Chưa có"). */
  name: string;
  src?: string | null;
  /** Second line: employee code, position or unit. */
  caption?: string;
  /** `sm` in table, tree and chart cells; `md` in detail lists and Select options. */
  size?: 'sm' | 'md';
  vacant?: boolean;
  /** The caption wraps instead of being cut: detail lists, where nothing else shows the full text. */
  wrapCaption?: boolean;
  /** The name wraps instead of being cut: org chart cards, which never truncate. */
  wrapName?: boolean;
  className?: string;
};

export function Person({ name, src, caption, size = 'sm', vacant = false, wrapCaption = false, wrapName = false, className }: PersonProps) {
  return (
    <span className={cn('inline-flex max-w-full min-w-0 items-center gap-2', vacant && 'text-ink-muted', className)}>
      <Avatar name={name} src={src ?? undefined} size={size} vacant={vacant} />
      <span className="flex min-w-0 flex-col">
        <span className={wrapName ? '[overflow-wrap:anywhere]' : 'truncate'}>{name}</span>
        {caption ? <span className={cn('text-caption text-ink-muted', wrapCaption ? '[overflow-wrap:anywhere]' : 'truncate')}>{caption}</span> : null}
      </span>
    </span>
  );
}
