// Filter "Đơn vị tổ chức": the org tree in a menu with a search box; a unit includes the units below it.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeSelect } from '@/components/ui/tree-select';
import { unitTree } from '@/features/employee/unit-choices';
import { useOrgUnitOptions } from '@/features/org-unit/api';

export type ShiftCalendarUnitFilterProps = { value: string; onChange: (id: string) => void; className?: string };

export function ShiftCalendarUnitFilter({ value, onChange, className }: ShiftCalendarUnitFilterProps) {
  const { t } = useTranslation();
  const units = useOrgUnitOptions();
  const nodes = useMemo(() => (units.data ? unitTree(units.data) : []), [units.data]);
  return (
    <TreeSelect
      label={t('shiftCalendar.filter.unit')}
      nodes={nodes}
      value={value}
      onChange={onChange}
      allLabel={t('shiftCalendar.filter.allUnits')}
      searchLabel={t('shiftCalendar.filter.findUnit')}
      noMatchText={t('shiftCalendar.filter.noUnit')}
      className={className}
    />
  );
}
