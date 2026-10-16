// Library component "Radio card" (design #18): one choice of a group as a bordered card with a caption line, for
// choices that need a word each (leave type with its balance). Selected: brand-blue border on info. The native radio
// stays in the DOM, so arrow keys move within the group.
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

export type RadioCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'title'> & {
  title: string;
  /** One line under the title: "Còn 4,5 · ứng thêm được 2". */
  caption?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function RadioCard({ title, caption, className, ...input }: RadioCardProps) {
  return (
    <label
      className={cn(
        'relative flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-md border border-line bg-surface px-3 py-2 hover:bg-surface-muted',
        'has-checked:border-brand-blue has-checked:bg-info has-focus-visible:shadow-focus-ring has-disabled:cursor-not-allowed has-disabled:opacity-45',
        className,
      )}
    >
      <input type="radio" className="peer sr-only" {...input} />
      <span className="text-body-strong">{title}</span>
      {caption ? <span className="text-caption text-ink-muted">{caption}</span> : null}
    </label>
  );
}
