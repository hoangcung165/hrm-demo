// Stand-in for the profile (`/employees/:id`, HRM-06/FE-3) and "Thêm nhân viên" (`/employees/new`, FE-2) until
// their slices arrive, so the links of the list already lead somewhere. Adding needs EMPLOYEE_EDIT.
import { ArrowLeft, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { cn } from '@/lib/utils';

export type EmployeePlaceholderPageProps = { kind: 'profile' | 'create' };

export function EmployeePlaceholderPage({ kind }: EmployeePlaceholderPageProps) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const denied = kind === 'create' && !permissions.includes('EMPLOYEE_EDIT');
  const back = (
    <Link to="/employees" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('employees.placeholder.back')}
    </Link>
  );
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Link to="/employees" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('employees.title')}
        </Link>
        <h1 className="text-title">{t(`employees.placeholder.${kind}.heading`)}</h1>
      </div>
      <Card bare>
        {denied ? (
          <StateBlock variant="denied" title={t('employees.placeholder.createDenied.title')} description={t('employees.placeholder.createDenied.text')} actions={back} />
        ) : (
          <StateBlock variant="empty" icon={<UserRound />} title={t(`employees.placeholder.${kind}.title`)} description={t(`employees.placeholder.${kind}.text`)} actions={back} />
        )}
      </Card>
    </div>
  );
}
