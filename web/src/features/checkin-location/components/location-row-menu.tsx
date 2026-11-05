// The actions of one Địa điểm chấm công in the list: a "more" button that opens a Menu. A place is never deleted, only
// made inactive, so the menu has no "Xóa".
import { Ban, Ellipsis, Pencil, RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import type { CheckinLocation } from '../api';
import { useLocationActions } from '../location-actions-context';

export type LocationRowMenuProps = {
  place: CheckinLocation;
  /** The 44px button of a compact row. */
  touch?: boolean;
};

export function LocationRowMenu({ place, touch = false }: LocationRowMenuProps) {
  const { t } = useTranslation();
  const actions = useLocationActions();
  const button = useRef<HTMLButtonElement>(null);
  const items: MenuItem[] = [
    { id: 'edit', label: t('checkinLocations.row.edit'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(place, button.current) },
    place.active
      ? { id: 'deactivate', label: t('checkinLocations.row.deactivate'), icon: <Ban aria-hidden="true" />, onSelect: () => actions.askDeactivate(place, button.current) }
      : { id: 'reactivate', label: t('checkinLocations.row.reactivate'), icon: <RotateCcw aria-hidden="true" />, onSelect: () => actions.askReactivate(place, button.current) },
  ];
  return (
    <Menu
      items={items}
      className="w-60"
      trigger={
        <Button ref={button} variant="ghost" size="icon-sm" aria-label={t('checkinLocations.row.more', { name: place.name })} className={cn('text-ink-muted', touch && 'size-11')}>
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    />
  );
}
