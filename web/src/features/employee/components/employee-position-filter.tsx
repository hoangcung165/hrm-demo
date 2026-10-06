// Filter "Chức danh": every item of the positions catalog by name, deactivated ones marked.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { usePositions } from '../api';
import type { EmployeeFilters } from '../use-employee-filters';

export type EmployeePositionFilterProps = {
  filters: EmployeeFilters;
  id?: string;
  disabled?: boolean;
  className?: string;
};

// The Select has no empty value: this one stands for "every position".
const ALL = 'ALL';

export function EmployeePositionFilter({ filters, id, disabled, className }: EmployeePositionFilterProps) {
  const { t } = useTranslation();
  const positions = usePositions();
  const options = [
    { value: ALL, label: t('employees.filter.allPositions') },
    ...(positions.data ?? []).map((item) => ({ value: item.id, label: item.active ? item.name : t('employees.filter.positionInactive', { name: item.name }) })),
  ];
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('employees.filter.position')}
      value={filters.query.positionId || ALL}
      onChange={(value) => filters.setPosition(value === ALL ? '' : value)}
      options={options}
      placeholder={t('employees.filter.allPositions')}
      disabled={disabled}
      className={className}
    />
  );
}
