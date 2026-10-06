// Accounts and roles (HRM-04): the Account list and the role and permission matrix.
// Needs ACCOUNT_LIST; adding and editing need ACCOUNT_EDIT. The tab lives in `?view=`.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { Tabs } from '@/components/ui/tabs';
import { AccountActionsProvider } from '@/features/account/components/account-actions-provider';
import { useCurrentAccount } from '@/features/auth/account-context';
import { AccountListSection } from './account-list-section';
import { AccountsPageHeader } from './accounts-page-header';
import { RoleMatrixSection } from './role-matrix-section';

type AccountsView = 'list' | 'roles';

export function AccountsPage() {
  const { t } = useTranslation();
  const [revoked, setRevoked] = useState(false);
  const account = useCurrentAccount();
  const canView = account.permissions.includes('ACCOUNT_LIST') && !revoked;
  const [params, setParams] = useSearchParams();
  const view: AccountsView = params.get('view') === 'roles' ? 'roles' : 'list';
  // Each tab starts clean: the filters and the page of the list do not follow to the other tab.
  const setView = (next: AccountsView) => setParams(next === 'roles' ? { view: 'roles' } : {});
  const canEdit = canView && account.permissions.includes('ACCOUNT_EDIT');
  return (
    <AccountActionsProvider enabled={canEdit} onDenied={() => setRevoked(true)}>
      <div className="flex flex-col gap-4 md:gap-6">
        <AccountsPageHeader view={view} />
        {canView ? (
          <Tabs
            label={t('accounts.views.label')}
            tabs={[
              { id: 'list', label: t('accounts.views.list') },
              { id: 'roles', label: t('accounts.views.roles') },
            ]}
            active={view}
            onChange={setView}
          >
            {view === 'list' ? <AccountListSection onDenied={() => setRevoked(true)} /> : <RoleMatrixSection onDenied={() => setRevoked(true)} />}
          </Tabs>
        ) : (
          <Card bare>
            <StateBlock variant="denied" title={t('accounts.denied.title')} description={t('accounts.denied.text')} />
          </Card>
        )}
      </div>
    </AccountActionsProvider>
  );
}
