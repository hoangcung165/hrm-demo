// Filter "Trạng thái": on probation and official (the default), one status, or every status.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { STATUS_FILTERS, type EmployeeFilters, type StatusFilter } from '../use-employee-filters';

export type EmployeeStatusFilterProps = {
  filters: EmployeeFilters;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export function EmployeeStatusFilter({ filters, id, disabled, className }: EmployeeStatusFilterProps) {
  const { t } = useTranslation();
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('employees.filter.status')}
      value={filters.status}
      onChange={(value) => filters.setStatus(value as StatusFilter)}
      options={STATUS_FILTERS.map((value) => ({ value, label: t(`employees.filter.statusOption.${value}`) }))}
      placeholder={t('employees.filter.statusOption.CURRENT')}
      disabled={disabled}
      className={className}
    />
  );
}
