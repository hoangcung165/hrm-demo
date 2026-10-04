// Account menu in the header (library component "Menu"): who is signed in, then actions.
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { useCurrentAccount } from '@/features/auth/account-context';

export type AccountMenuProps = {
  onOpenProfile: () => void;
  onChangePassword: () => void;
  onSignOut: () => void;
};

export function AccountMenu({ onOpenProfile, onChangePassword, onSignOut }: AccountMenuProps) {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const items: MenuItem[] = [
    { id: 'profile', label: t('account.profile'), icon: <User aria-hidden="true" />, onSelect: onOpenProfile },
    { id: 'password', label: t('account.changePassword'), icon: <KeyRound aria-hidden="true" />, onSelect: onChangePassword },
    { id: 'sign-out', label: t('account.signOut'), icon: <LogOut aria-hidden="true" />, onSelect: onSignOut, separated: true },
  ];
  return (
    <Menu
      items={items}
      trigger={
        <button
          type="button"
          aria-label={t('account.menuOf', { name: account.name })}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-ink hover:bg-surface-muted data-[state=open]:bg-surface-muted"
        >
          <Avatar name={account.name} />
          <span className="hidden max-w-[200px] truncate font-medium md:inline">{account.name}</span>
          <ChevronDown aria-hidden="true" className="hidden size-4 stroke-[1.5] text-ink-muted md:inline" />
        </button>
      }
      head={
        <div>
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            <Avatar name={account.name} size="lg" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{account.name}</span>
              {account.email !== account.name ? (
                <span className="truncate text-caption text-ink-muted">{account.email}</span>
              ) : null}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 px-3 pb-3">
            {account.roles.map((role) => (
              <Badge key={role} variant="info">
                {t(`role.${role}`)}
              </Badge>
            ))}
          </div>
        </div>
      }
    />
  );
}
