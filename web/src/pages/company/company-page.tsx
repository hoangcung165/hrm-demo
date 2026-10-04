// Company info (HRM-02): the form and the logo for Accounts with COMPANY_EDIT, a denied state for the others.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useCompany } from '@/features/company/api';
import { CompanyForm } from '@/features/company/components/company-form';
import { CompanyLogoCard } from '@/features/company/components/company-logo-card';
import { CompanySkeleton } from './company-skeleton';

export function CompanyPage() {
  const { t } = useTranslation();
  const canEdit = useCurrentAccount().permissions.includes('COMPANY_EDIT');
  const company = useCompany();
  return (
    <div className="flex max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t('company.title')}</h1>
        {canEdit ? <p className="text-ink-muted">{t('company.intro')}</p> : null}
      </div>
      {!canEdit ? (
        <Card bare>
          <StateBlock variant="denied" title={t('company.denied.title')} description={t('company.denied.text')} />
        </Card>
      ) : company.isPending ? (
        <CompanySkeleton />
      ) : company.isError ? (
        <Card bare>
          <ErrorState title={t('company.loadError')} onRetry={() => void company.refetch()} />
        </Card>
      ) : (
        <>
          <CompanyForm company={company.data} />
          <CompanyLogoCard company={company.data} />
        </>
      )}
    </div>
  );
}
