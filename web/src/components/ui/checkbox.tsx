// Library component "Checkbox": an 18px box with its label. The native input stays in the DOM for the keyboard and forms.
import { Check } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { children: ReactNode; ref?: Ref<HTMLInputElement> };

export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    // `relative`: the hidden input stays inside its label, so focus scrolls the box into view inside a scrolling dialog.
    <label className={cn('relative inline-flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed', className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="grid size-4.5 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink-muted bg-surface text-on-brand peer-checked:border-brand-blue peer-checked:bg-brand-blue peer-focus-visible:shadow-focus-ring peer-disabled:opacity-45 [&_svg]:size-3.5 [&_svg]:stroke-[2.5]"
      >
        <Check />
      </span>
      {children}
    </label>
  );
}
