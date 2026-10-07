// Thêm nhân viên (HRM-06): a full page, not a dialog (about fifteen fields and a tree picker). Needs EMPLOYEE_EDIT.
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EmployeeCreateForm } from '@/features/employee/components/employee-create-form';
import { cn } from '@/lib/utils';

export function EmployeeCreatePage() {
  const { t } = useTranslation();
  const canAdd = useCurrentAccount().permissions.includes('EMPLOYEE_EDIT');
  return (
    <div className="flex max-w-240 flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Link to="/employees" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('employees.title')}
        </Link>
        <h1 className="text-title">{t('employees.add')}</h1>
      </div>
      {canAdd ? (
        <EmployeeCreateForm />
      ) : (
        <Card bare>
          <StateBlock
            variant="denied"
            title={t('employees.placeholder.createDenied.title')}
            description={t('employees.placeholder.createDenied.text')}
            actions={
              <Link to="/employees" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                {t('employees.placeholder.back')}
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
}
