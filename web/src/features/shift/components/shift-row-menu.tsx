// The actions of one shift in the list: a "more" button that opens a Menu. Rendered only with SHIFT_EDIT.
// A shift is never deleted, only turned off, so the menu has no "Xóa".
import { Ban, Ellipsis, Pencil, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import type { Shift } from '../api';
import { useShiftActions } from '../shift-actions-context';

export type ShiftRowMenuProps = {
  shift: Shift;
  /** The 44px button of a compact row. */
  touch?: boolean;
};

export function ShiftRowMenu({ shift, touch = false }: ShiftRowMenuProps) {
  const { t } = useTranslation();
  const actions = useShiftActions();
  const button = useRef<HTMLButtonElement>(null);
  if (!actions) return null;
  const items: MenuItem[] = [
    { id: 'edit', label: t('shifts.row.edit'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(shift, button.current) },
    shift.active
      ? { id: 'deactivate', label: t('shifts.row.deactivate'), icon: <Ban aria-hidden="true" />, onSelect: () => actions.askDeactivate(shift, button.current) }
      : { id: 'reactivate', label: t('shifts.row.reactivate'), icon: <RotateCcw aria-hidden="true" />, onSelect: () => actions.askReactivate(shift, button.current) },
  ];
  return (
    <Menu
      items={items}
      className="w-60"
      trigger={
        <Button ref={button} variant="ghost" size="icon-sm" aria-label={t('shifts.row.more', { name: shift.name })} className={cn('text-ink-muted', touch && 'size-11')}>
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    />
  );
}
