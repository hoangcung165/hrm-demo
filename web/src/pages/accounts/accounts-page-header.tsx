// Title of the Accounts and roles page, with the add action on the list tab for Accounts that may edit.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAccountActions } from '@/features/account/account-actions-context';

export type AccountsPageHeaderProps = {
  /** The list tab is showing: the only place where an Account is added. */
  adding: boolean;
};

export function AccountsPageHeader({ adding }: AccountsPageHeaderProps) {
  const { t } = useTranslation();
  const actions = useAccountActions();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="min-w-0 flex-1 text-title">{t('accounts.title')}</h1>
      {actions && adding ? (
        <Button ref={actions.addButtonRef} onClick={actions.openAdd} className="max-md:h-11">
          <Plus aria-hidden="true" />
          {t('accounts.add')}
        </Button>
      ) : null}
    </div>
  );
}
