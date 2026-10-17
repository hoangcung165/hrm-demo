// Shared loading, permission and retry states for Employee profile record tabs.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StateBlock } from '@/components/ui/state-block';
import { ApiError } from '@/lib/api';

export type RecordQueryState = {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
};

export function ProfileRecordsState({
  query, section, children,
}: {
  query: RecordQueryState;
  section: 'bank' | 'dependents' | 'insurance' | 'documents' | 'skills' | 'certificates' | 'projects' | 'history';
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const title = t(section === 'certificates' ? 'employees.profile.qualifications.certificates' : `employees.profile.tab.${section}`);
  if (query.isPending) {
    return (
      <Card label={t('employees.profile.records.loading', { name: title })} busy>
        <div role="status" className="flex flex-col gap-4" aria-label={t('employees.profile.records.loading', { name: title })}>
          <Skeleton className="w-2/3" />
          <Skeleton className="w-4/5" />
          <Skeleton className="w-1/2" />
        </div>
      </Card>
    );
  }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 403) {
      const prefix = section === 'skills' || section === 'certificates' ? 'employees.profile.qualifications' : section === 'projects' ? 'employees.profile.projects' : section === 'history' ? 'employees.profile.history' : 'employees.profile.records';
      return (
        <Card bare>
          <StateBlock variant="denied" title={t(`${prefix}.deniedTitle`)} description={t(`${prefix}.deniedText`)} />
        </Card>
      );
    }
    return (
      <Card bare>
        <ErrorState title={t('employees.profile.records.loadError', { name: title })}
          onRetry={() => void query.refetch()} />
      </Card>
    );
  }
  return <>{children}</>;
}

export function ProfileRecordsEmpty({ section, icon }: {
  section: 'bank' | 'dependents' | 'insurance';
  icon: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card bare>
      <EmptyState icon={icon} title={t(`employees.profile.records.${section}.emptyTitle`)}
        description={t(`employees.profile.records.${section}.emptyText`)} />
    </Card>
  );
}
