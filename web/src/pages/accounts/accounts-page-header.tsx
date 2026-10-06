// Title of the Accounts and roles page, with the action of the tab for Accounts that may edit: add on the list
// tab, restore the default permissions on the roles tab.
import { Plus } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAccountActions } from '@/features/account/account-actions-context';
import { RoleResetButton } from '@/features/role/components/role-reset-button';

export type AccountsPageHeaderProps = {
  view: 'list' | 'roles';
};

export function AccountsPageHeader({ view }: AccountsPageHeaderProps) {
  const { t } = useTranslation();
  const actions = useAccountActions();
  // Focus lands here after a reset, which removes its own button.
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 ref={title} tabIndex={-1} className="min-w-0 flex-1 text-title outline-none">
        {t('accounts.title')}
      </h1>
      {actions && view === 'list' ? (
        <Button ref={actions.addButtonRef} onClick={actions.openAdd} className="max-md:h-11">
          <Plus aria-hidden="true" />
          {t('accounts.add')}
        </Button>
      ) : null}
      {actions && view === 'roles' ? <RoleResetButton fallbackFocus={title} /> : null}
    </div>
  );
}
