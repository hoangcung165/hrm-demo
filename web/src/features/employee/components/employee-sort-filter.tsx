// "Sắp xếp" of the filter dialog at 390: by employee code (the default), by name, or newest hires first.
// The desktop table has no sortable header yet, so it keeps the default.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { EMPLOYEE_SORTS, type EmployeeSort } from '../api';
import type { EmployeeFilters } from '../use-employee-filters';

export type EmployeeSortFilterProps = { filters: EmployeeFilters; id?: string; className?: string };

export function EmployeeSortFilter({ filters, id, className }: EmployeeSortFilterProps) {
  const { t } = useTranslation();
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('employees.filter.sort')}
      value={filters.query.sort}
      onChange={(value) => filters.setSort(value as EmployeeSort)}
      options={EMPLOYEE_SORTS.map((value) => ({ value, label: t(`employees.filter.sortOption.${value}`) }))}
      placeholder={t('employees.filter.sortOption.code')}
      className={className}
    />
  );
}
