// Nhân viên (HRM-06): the employee list within the caller's data scope. Needs EMPLOYEE_VIEW; "Thêm nhân viên"
// needs EMPLOYEE_EDIT; "Xuất Excel" and "Nhập từ Excel" (HRM-07) follow the same permissions. The search, filters
// and page live in the URL.
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EmployeeScopeAlert } from '@/features/employee/components/employee-scope-alert';
import { useEmployeeFilters } from '@/features/employee/use-employee-filters';
import { useMediaQuery } from '@/lib/use-media-query';
import { EmployeeListActions } from './employee-list-actions';
import { EmployeeListDenied } from './employee-list-denied';
import { EmployeeListSection } from './employee-list-section';

export function EmployeesPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const canView = permissions.includes('EMPLOYEE_VIEW');
  const canAdd = canView && permissions.includes('EMPLOYEE_EDIT');
  const filters = useEmployeeFilters();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-title">{t('employees.title')}</h1>
        <EmployeeListActions filters={filters} canView={canView} canEdit={canAdd} compact={compact} />
      </div>
      {canView ? (
        <>
          <EmployeeScopeAlert />
          <EmployeeListSection filters={filters} canAdd={canAdd} />
        </>
      ) : (
        <EmployeeListDenied />
      )}
    </div>
  );
}
