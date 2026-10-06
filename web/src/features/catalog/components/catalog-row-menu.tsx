// The actions of one catalog item in the list: a "more" button that opens a Menu. Rendered only with CATALOG_EDIT.
import { Ellipsis, Pencil } from 'lucide-react';
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
  const items: MenuItem[] = [{ id: 'edit', label: t('catalogs.row.edit'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(item, button.current) }];
  return (
    <Menu
      items={items}
      className="w-54"
      trigger={
        <Button ref={button} variant="ghost" size="icon-sm" aria-label={t('catalogs.row.more', { name: item.name })} className={cn('text-ink-muted', touch && 'size-11')}>
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    />
  );
}
