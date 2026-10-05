// The actions of one Account in the list: a "more" button that opens a Menu. Rendered only with ACCOUNT_EDIT.
import { Ellipsis, Pencil } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { useAccountActions } from '../account-actions-context';
import type { AccountRow } from '../api';

export type AccountRowMenuProps = {
  account: AccountRow;
  /** The 44px button of a compact row. */
  touch?: boolean;
};

/** Whether the row has any action in this slice. A demo persona cannot be edited; it gets lock and unlock in FE-3. */
export const hasRowActions = (account: AccountRow) => !account.demoPersona;

export function AccountRowMenu({ account, touch = false }: AccountRowMenuProps) {
  const { t } = useTranslation();
  const actions = useAccountActions();
  const button = useRef<HTMLButtonElement>(null);
  if (!actions || !hasRowActions(account)) return null;
  const items: MenuItem[] = [{ id: 'edit', label: t('accounts.row.edit'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(account, button.current) }];
  return (
    <Menu
      items={items}
      className="w-54"
      trigger={
        <Button ref={button} variant="ghost" size="icon-sm" aria-label={t('accounts.row.more', { name: account.fullName })} className={cn('text-ink-muted', touch && 'size-11')}>
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    />
  );
}
