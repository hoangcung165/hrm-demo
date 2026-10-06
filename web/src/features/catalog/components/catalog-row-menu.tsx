// The actions of one catalog item in the list: a "more" button that opens a Menu. Rendered only with CATALOG_EDIT.
// An item in use is not deleted: the menu says so in place of "Xóa".
import { Ban, Ellipsis, Info, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { useCatalogActions } from '../catalog-actions-context';
import type { CatalogItem } from '../api';

export type CatalogRowMenuProps = {
  item: CatalogItem;
  /** The 44px button of a compact row. */
  touch?: boolean;
};

export function CatalogRowMenu({ item, touch = false }: CatalogRowMenuProps) {
  const { t } = useTranslation();
  const actions = useCatalogActions();
  const button = useRef<HTMLButtonElement>(null);
  if (!actions) return null;
  const items: MenuItem[] = [
    { id: 'edit', label: t('catalogs.row.edit'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(item, button.current) },
    item.active
      ? { id: 'deactivate', label: t('catalogs.row.deactivate'), icon: <Ban aria-hidden="true" />, onSelect: () => actions.deactivate(item) }
      : { id: 'reactivate', label: t('catalogs.row.reactivate'), icon: <RotateCcw aria-hidden="true" />, onSelect: () => actions.reactivate(item) },
    ...(item.inUse
      ? []
      : [{ id: 'delete', label: t('catalogs.row.delete'), icon: <Trash2 aria-hidden="true" />, danger: true, separated: true, onSelect: () => actions.openDelete(item, button.current) }]),
  ];
  return (
    <Menu
      items={items}
      className="w-60"
      foot={
        item.inUse ? (
          <>
            <Info aria-hidden="true" />
            {t(item.active ? 'catalogs.row.inUse' : 'catalogs.row.inUseInactive')}
          </>
        ) : undefined
      }
      trigger={
        <Button ref={button} variant="ghost" size="icon-sm" aria-label={t('catalogs.row.more', { name: item.name })} className={cn('text-ink-muted', touch && 'size-11')}>
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    />
  );
}
