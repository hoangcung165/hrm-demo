// Nhân viên (HRM-06): the employee list within the caller's data scope. Needs EMPLOYEE_VIEW; "Thêm nhân viên"
// needs EMPLOYEE_EDIT. The search, filters and page live in the URL.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EmployeeScopeAlert } from '@/features/employee/components/employee-scope-alert';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/lib/use-media-query';
import { EmployeeListDenied } from './employee-list-denied';
import { EmployeeListSection } from './employee-list-section';

export function EmployeesPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const canView = permissions.includes('EMPLOYEE_VIEW');
  const canAdd = canView && permissions.includes('EMPLOYEE_EDIT');
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-title">{t('employees.title')}</h1>
        {canAdd ? (
          // At 390 the label is "Thêm"; the link keeps its full name.
          <Link to="/employees/new" aria-label={compact ? t('employees.add') : undefined} className={cn(buttonVariants(), 'max-md:h-11')}>
            <Plus aria-hidden="true" />
            {t(compact ? 'employees.addShort' : 'employees.add')}
          </Link>
        ) : null}
      </div>
      {canView ? (
        <>
          <EmployeeScopeAlert />
          <EmployeeListSection canAdd={canAdd} />
        </>
      ) : (
        <EmployeeListDenied />
      )}
    </div>
  );
}
