// Library component "Menu", person items: a Menu whose items are people (Avatar 32, name, one caption line),
// 56px high, under an optional caption heading. `current` marks the person in use; `disabled` cannot be picked.
// Keyboard and focus handling come from Radix, as in `menu.tsx`.
import { Check } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';

export type PersonMenuItem = {
  id: string;
  name: string;
  /** One line under the name, e.g. role and title, or why the item cannot be picked. */
  caption?: string;
  /** The person in use (`is-current`): `brand-blue-soft` fill, a trailing check and `aria-current`. */
  current?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export type PersonMenuProps = {
  /** The button that opens the menu; its accessible name also names the menu. */
  trigger: ReactNode;
  /** Caption heading above the items. */
  heading?: string;
  items: PersonMenuItem[];
  /** Shown instead of the items while they load, when loading failed, or when there are none. */
  status?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function PersonMenu({ trigger, heading, items, status, onOpenChange, className }: PersonMenuProps) {
  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className={cn('z-50 w-80 max-w-[calc(100vw-32px)] rounded-md border border-line bg-surface p-1 shadow-lg', className)}
        >
          {heading ? <DropdownMenu.Label className="px-3 pt-2 pb-1 text-caption text-ink-muted">{heading}</DropdownMenu.Label> : null}
          {status ?? items.map((item) => <PersonMenuRow key={item.id} item={item} />)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function PersonMenuRow({ item }: { item: PersonMenuItem }) {
  return (
    <DropdownMenu.Item
      disabled={item.disabled}
      onSelect={item.onSelect}
      aria-current={item.current ? 'true' : undefined}
      className={cn(
        // Hover fills the item; keyboard focus adds the inset ring of Tree rows, as in `menu.tsx`.
        'flex h-14 cursor-pointer items-center gap-3 rounded-sm px-3 text-ink outline-none focus-visible:shadow-none focus-visible:inset-ring-2 focus-visible:inset-ring-brand-blue data-[highlighted]:bg-surface-muted',
        item.current && 'bg-brand-blue-soft data-[highlighted]:bg-brand-blue-soft',
        'data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-muted',
      )}
    >
      <Avatar name={item.name} size="md" className={item.disabled ? 'bg-surface-muted text-ink-muted' : undefined} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-strong">{item.name}</span>
        {item.caption ? <span className="truncate text-caption text-ink-muted">{item.caption}</span> : null}
      </span>
      {item.current ? <Check aria-hidden="true" className="size-4 shrink-0 stroke-[1.5] text-brand-blue" /> : null}
    </DropdownMenu.Item>
  );
}
