// The page actions of the employee list. Desktop: [Xuất Excel] [Nhập từ Excel] [Thêm nhân viên], one primary,
// last. At 390: [Thêm] and "Thao tác khác" with "Xuất Excel". Export needs EMPLOYEE_VIEW; import and add need
// EMPLOYEE_EDIT. The export takes the list's search, filters and order from the URL.
import { Plus, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { useEmployees } from '@/features/employee/api';
import { EmployeeExportButton } from '@/features/employee/components/employee-export-button';
import { EmployeeMoreActions } from '@/features/employee/components/employee-more-actions';
import { useEmployeeExport } from '@/features/employee/use-employee-export';
import type { EmployeeFilters } from '@/features/employee/use-employee-filters';
import { cn } from '@/lib/utils';

export type EmployeeListActionsProps = {
  filters: EmployeeFilters;
  canView: boolean;
  canEdit: boolean;
  compact: boolean;
};

export function EmployeeListActions({ filters, canView, canEdit, compact }: EmployeeListActionsProps) {
  const { t } = useTranslation();
  // The same query as the table below: one request, read twice.
  const employees = useEmployees(filters.query, canView);
  const exporting = useEmployeeExport();
  const empty = employees.data?.total === 0;
  // Nothing to export while the rows of this filter are not in, or when they failed or there are none.
  const disabled = !employees.data || employees.isPlaceholderData || employees.isError || empty;
  const onExport = () => exporting.run(filters.query);

  const add = canEdit ? (
    // At 390 the label is "Thêm"; the link keeps its full name.
    <Link to="/employees/new" aria-label={compact ? t('employees.add') : undefined} className={cn(buttonVariants(), 'max-md:h-11')}>
      <Plus aria-hidden="true" />
      {t(compact ? 'employees.addShort' : 'employees.add')}
    </Link>
  ) : null;

  if (compact) {
    return (
      <>
        {add}
        {canView ? <EmployeeMoreActions busy={exporting.busy} disabled={disabled} onExport={onExport} /> : null}
      </>
    );
  }
  return (
    <>
      {canView ? (
        <EmployeeExportButton busy={exporting.busy} disabled={disabled} emptyHint={empty ? t('employees.excel.nothingToExport') : undefined} onExport={onExport} />
      ) : null}
      {canEdit ? (
        <Link to="/employees/import" className={buttonVariants({ variant: 'secondary' })}>
          <Upload aria-hidden="true" />
          {t('employees.excel.import')}
        </Link>
      ) : null}
      {add}
    </>
  );
}
