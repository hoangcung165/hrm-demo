// The actions of one Account in the list: a "more" button that opens a Menu. Rendered only with ACCOUNT_EDIT.
import { Ellipsis, KeyRound, Lock, LockOpen, Pencil } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { useCurrentAccount } from '@/features/auth/account-context';
import { cn } from '@/lib/utils';
import { useAccountActions } from '../account-actions-context';
import type { AccountRow } from '../api';

export type AccountRowMenuProps = {
  account: AccountRow;
  /** The 44px button of a compact row. */
  touch?: boolean;
};

export function AccountRowMenu({ account, touch = false }: AccountRowMenuProps) {
  const { t } = useTranslation();
  const actions = useAccountActions();
  const ownId = useCurrentAccount().id;
  const button = useRef<HTMLButtonElement>(null);
  if (!actions) return null;
  const opener = () => button.current;
  // Nobody locks, unlocks or sets the password of their own Account (the password changes through "Đổi mật khẩu").
  const own = account.id === ownId;
  // A demo persona keeps the name, roles and password the seeder gave it: only its lock changes.
  const fixed = Boolean(account.demoPersona);
  const items: MenuItem[] = [
    ...(fixed ? [] : [{ id: 'edit', label: t('accounts.row.edit'), icon: <Pencil aria-hidden="true" />, onSelect: () => actions.openEdit(account, opener()) }]),
    ...(fixed || own ? [] : [{ id: 'password', label: t('accounts.row.setPassword'), icon: <KeyRound aria-hidden="true" />, onSelect: () => actions.openPassword(account, opener()) }]),
    ...(own
      ? []
      : account.status === 'LOCKED'
        ? [{ id: 'unlock', label: t('accounts.row.unlock'), icon: <LockOpen aria-hidden="true" />, separated: !fixed, onSelect: () => actions.unlock(account, opener()) }]
        : [{ id: 'lock', label: t('accounts.row.lock'), icon: <Lock aria-hidden="true" />, danger: true, separated: !fixed, onSelect: () => actions.openLock(account, opener()) }]),
  ];
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
