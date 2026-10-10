// Library component "Switch" (`hrm-check` + `hrm-switch`): turns one setting on or off at once, with its label and an
// optional caption on the left. A button with `role="switch"`; locked settings stay visible, disabled, with the reason.
import { Lock } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** One line under the label: what it does, or why it is locked. */
  caption?: ReactNode;
  /** Shown with a lock: the setting cannot change for this record. */
  locked?: boolean;
  className?: string;
};

export function Switch({ checked, onChange, label, caption, locked = false, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className={cn('cursor-pointer', locked && 'cursor-not-allowed text-ink-muted')}>
          {label}
        </label>
        {caption ? (
          <span id={`${id}-caption`} className="text-caption text-ink-muted">
            {caption}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {locked ? <Lock aria-hidden="true" className="size-4 stroke-[1.5] text-ink-muted" /> : null}
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={caption ? `${id}-caption` : undefined}
          disabled={locked}
          onClick={() => onChange(!checked)}
          className={cn(
            'flex h-5 w-9 cursor-pointer rounded-full p-0.5 focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-45 max-md:my-3',
            checked ? 'justify-end bg-brand-blue' : 'bg-ink-muted',
          )}
        >
          <span className="size-4 rounded-full bg-surface" />
        </button>
      </span>
    </div>
  );
}
