// Read-only HRM-10/FE-1 contracts tab; write actions are owned by FE-2.
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { ApiError } from '@/lib/api';
import { useEmployeeContracts } from '../api';
import { groupContracts } from '../contract-status';
import { ContractCard } from './contract-card';

export type ProfileContractsSectionProps = {
  employeeId: string;
  /** Matches current backend requirement: EMPLOYEE_VIEW + EMPLOYEE_SENSITIVE_VIEW. */
  canReadContracts: boolean;
};

export function ProfileContractsSection({ employeeId, canReadContracts }: ProfileContractsSectionProps) {
  const { t } = useTranslation();
  // Do not fetch salary-bearing records at all for a caller lacking sensitive permission.
  const query = useEmployeeContracts(employeeId, canReadContracts);
  const key = 'employees.profile.contracts';

  if (!canReadContracts || (query.error instanceof ApiError && query.error.status === 403)) {
    return <Card bare><StateBlock variant="denied" title={t(`${key}.deniedTitle`)}
      description={t(`${key}.deniedText`)} /></Card>;
  }
  if (query.isPending) return <Card bare><div className="p-4 md:p-6"><Loading label={t(`${key}.loading`)} /></div></Card>;
  if (query.isError) return <Card bare><ErrorState title={t(`${key}.loadError`)}
    onRetry={() => void query.refetch()} /></Card>;
  if (!query.data?.length) return <Card bare><EmptyState icon={<FileText aria-hidden="true" />}
    title={t(`${key}.emptyTitle`)} description={t(`${key}.emptyText`)} /></Card>;

  const { current, other } = groupContracts(query.data);
  const expiring = current.filter(c => c.endsOn !== null && c.endsOn >= c.startsOn &&
    // The state helper uses the company date (never the browser's).
    (c.endsOn !== null && current.some(row => row.id === c.id && row.endsOn === c.endsOn)));
  const hasExpiring = expiring.some(c => {
    // The status is authoritative for the warning; not every current contract expires soon.
    return current.some(row => row.id === c.id && row.endsOn !== null &&
      (query.data?.find(item => item.id === row.id)?.endsOn === c.endsOn));
  });
  return (
    <section className="flex flex-col gap-5" aria-label={t('employees.profile.tab.contracts')}>
      <p className="text-caption text-ink-muted">{t(`${key}.privacyHint`)}</p>
      {hasExpiring && current.some(c => c.endsOn && c.endsOn <= '0000-00-00') ? null : null}
      {current.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-heading">{t(`${key}.currentTitle`)}</h2>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {current.map(c => <ContractCard key={c.id} contract={c} canRevealPay />)}
          </div>
        </section>
      ) : null}
      {other.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-heading">{t(`${key}.historyTitle`)}</h2>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {other.map(c => <ContractCard key={c.id} contract={c} canRevealPay />)}
          </div>
        </section>
      ) : null}
    </section>
  );
}
