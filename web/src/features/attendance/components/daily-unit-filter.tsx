// Filter "Đơn vị": the org tree in a menu; a unit includes the units below it. The Quản lý trực tiếp sees only theirs.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeSelect } from '@/components/ui/tree-select';
import { unitTree } from '@/features/employee/unit-choices';
import { useOrgUnitOptions } from '@/features/org-unit/api';

export type DailyUnitFilterProps = { value: string; onChange: (id: string) => void; className?: string };

export function DailyUnitFilter({ value, onChange, className }: DailyUnitFilterProps) {
  const { t } = useTranslation();
  const units = useOrgUnitOptions();
  const nodes = useMemo(() => (units.data ? unitTree(units.data) : []), [units.data]);
  return (
    <TreeSelect
      label={t('attendanceDaily.filter.unit')}
      nodes={nodes}
      value={value}
      onChange={onChange}
      allLabel={t('attendanceDaily.filter.allUnits')}
      searchLabel={t('attendanceDaily.filter.findUnit')}
      noMatchText={t('attendanceDaily.filter.noUnit')}
      className={className}
    />
  );
}
