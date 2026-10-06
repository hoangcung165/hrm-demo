// Library component "Select": picks one value from a known list. Combobox + listbox, keyboard and typeahead come from Radix.
// Built so far: the plain single select and options indented by `level` (a Đơn vị tổ chức under its parent).
// Not built yet: `searchable`, person options and `clearable` (HRM-06). The Tree `picker` menu is `TreeSelect`.
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as RadixSelect } from 'radix-ui';
import type { Ref } from 'react';
import { cn } from '@/lib/utils';

export type SelectOption = {
  value: string;
  label: string;
  /** Depth in a hierarchy, 0 for the top; indents the option in the menu. */
  level?: number;
};

export type SelectProps = {
  /** Links the control to its label (`<label htmlFor>`), as Field does. */
  id?: string;
  /** `''` shows the placeholder. */
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** "Chọn …" */
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLButtonElement>;
  /** Names a control that has no visible label, e.g. a filter. */
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  className?: string;
};

const SCROLL_HINT = 'flex h-6 cursor-default items-center justify-center text-ink-muted [&_svg]:size-4 [&_svg]:stroke-[1.5]';

export function Select({ id, value, onChange, options, placeholder, disabled, invalid, ref, className, ...aria }: SelectProps) {
  const selected = options.find((option) => option.value === value);
  return (
    <RadixSelect.Root value={selected ? value : ''} onValueChange={onChange} disabled={disabled}>
      <RadixSelect.Trigger
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        {...aria}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3 text-left text-ink',
          'focus-visible:border-brand-blue data-[state=open]:border-brand-blue data-[state=open]:shadow-focus-ring data-[placeholder]:text-ink-muted',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
          // Invalid keeps the danger border under the focus ring, like Input.
          invalid && 'border-danger focus-visible:border-danger data-[state=open]:border-danger',
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <RadixSelect.Value placeholder={placeholder}>{selected?.label}</RadixSelect.Value>
        </span>
        <RadixSelect.Icon className="shrink-0 text-ink-muted">
          <ChevronDown aria-hidden="true" className="size-4 stroke-[1.5]" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        {/* Above a Dialog (z-50), as wide as the control. The list scrolls after 232px; a chevron shows there is more that way. */}
        <RadixSelect.Content position="popper" sideOffset={4} className="z-60 w-(--radix-select-trigger-width) rounded-md border border-line bg-surface shadow-lg">
          <RadixSelect.ScrollUpButton className={SCROLL_HINT}>
            <ChevronUp aria-hidden="true" />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="max-h-58 p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                style={option.level ? { paddingLeft: `calc(var(--space-3) + ${option.level} * var(--space-4))` } : undefined}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 outline-none select-none focus-visible:shadow-none data-[highlighted]:bg-surface-muted data-[state=checked]:bg-brand-blue-soft"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="shrink-0 text-brand-blue">
                  <Check aria-hidden="true" className="size-4 stroke-[1.5]" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className={SCROLL_HINT}>
            <ChevronDown aria-hidden="true" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
