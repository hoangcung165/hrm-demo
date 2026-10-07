// The profile cannot be shown yet or at all: loading (header Card skeleton), 404, 403, or a load error.
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StateBlock } from '@/components/ui/state-block';

export type EmployeeProfileStateProps = {
  state: 'loading' | 'notFound' | 'denied' | 'error';
  /** Where "Về danh sách nhân viên" goes; absent for an Account that cannot open the list. */
  listHref?: string;
  onRetry?: () => void;
};

export function EmployeeProfileState({ state, listHref, onRetry }: EmployeeProfileStateProps) {
  const { t } = useTranslation();
  if (state === 'loading') {
    return (
      <section role="status" aria-busy="true" aria-label={t('employees.profile.loading')} className="rounded-md border border-line bg-surface">
        <div className="flex items-center gap-4 p-6">
          <Skeleton shape="circle" className="size-12" />
          <span className="flex flex-1 flex-col gap-3">
            <Skeleton shape="title" className="w-[34%]" />
            <Skeleton className="w-[24%]" />
          </span>
        </div>
        <div className="flex flex-col gap-3 border-t border-line p-6">
          <Skeleton className="w-[66%]" />
          <Skeleton className="w-[52%]" />
          <Skeleton className="w-[58%]" />
        </div>
      </section>
    );
  }
  if (state === 'error') {
    return (
      <Card bare>
        <ErrorState title={t('employees.profile.loadError')} onRetry={onRetry} />
      </Card>
    );
  }
  const back = listHref ? (
    <Link to={listHref} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('employees.placeholder.back')}
    </Link>
  ) : undefined;
  return (
    <Card bare>
      {state === 'notFound' ? (
        <StateBlock variant="plain" icon={<Search />} title={t('employees.profile.notFound.title')} description={t('employees.profile.notFound.text')} actions={back} />
      ) : (
        <StateBlock variant="denied" title={t('employees.profile.denied.title')} description={t('employees.profile.denied.text')} actions={back} />
      )}
    </Card>
  );
}
