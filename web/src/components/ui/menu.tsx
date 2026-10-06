// Library component "Menu": dropdown of actions opened from a button. Keyboard and focus handling come from Radix.
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type MenuItem = {
  id: string;
  label: string;
  /** Lucide 16px icon. */
  icon?: ReactNode;
  onSelect: () => void;
  /** Draws a separator above this item. */
  separated?: boolean;
  /** Destructive (`is-danger`): label and icon in `danger`; last in the menu, and it still opens a confirm Dialog. */
  danger?: boolean;
};

export type MenuProps = {
  /** The button that opens the menu (a native button works); its accessible name also names the menu. */
  trigger: ReactNode;
  /** Optional block above the items, e.g. who is signed in. */
  head?: ReactNode;
  /** Optional note below the items, after a separator: why an action is missing ("label" of the library menu). */
  foot?: ReactNode;
  items: MenuItem[];
  className?: string;
};

export function Menu({ trigger, head, foot, items, className }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={16}
          className={cn('z-50 w-[272px] rounded-md border border-line bg-surface p-1 shadow-lg', className)}
        >
          {head ? (
            <>
              {head}
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
            </>
          ) : null}
          {items.map((item) => (
            <div key={item.id}>
              {item.separated ? <DropdownMenu.Separator className="my-1 h-px bg-line" /> : null}
              <DropdownMenu.Item
                onSelect={item.onSelect}
                className={cn(
                  // Hover fills the item; keyboard focus adds the inset ring of Tree rows (the fill alone is 1.05:1).
                  'flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 outline-none focus-visible:shadow-none focus-visible:inset-ring-2 focus-visible:inset-ring-brand-blue data-[highlighted]:bg-surface-muted max-md:h-11 [&_svg]:size-4 [&_svg]:stroke-[1.5]',
                  item.danger ? 'text-danger' : 'text-ink [&_svg]:text-ink-muted',
                )}
              >
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            </div>
          ))}
          {foot ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
              <DropdownMenu.Label className="flex gap-2 px-3 py-2 text-caption text-ink-muted [&_svg]:mt-px [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]">{foot}</DropdownMenu.Label>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
