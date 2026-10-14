// Filter "Phòng ban": the org tree in a menu with a search box. A unit includes the units below it.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeSelect } from '@/components/ui/tree-select';
import { unitTree } from '@/features/employee/unit-choices';
import { useOrgUnitOptions } from '@/features/org-unit/api';
import type { HeatmapFilters } from '../use-heatmap-filters';

export type HeatmapUnitFilterProps = { filters: HeatmapFilters; id?: string; disabled?: boolean; className?: string };

export function HeatmapUnitFilter({ filters, id, disabled, className }: HeatmapUnitFilterProps) {
  const { t } = useTranslation();
  const units = useOrgUnitOptions();
  const nodes = useMemo(() => (units.data ? unitTree(units.data) : []), [units.data]);
  return (
    <TreeSelect
      id={id}
      label={t('resources.filter.unit')}
      nodes={nodes}
      value={filters.query.orgUnitId}
      onChange={filters.setOrgUnit}
      allLabel={t('resources.filter.allUnits')}
      searchLabel={t('resources.filter.findUnit')}
      noMatchText={t('resources.filter.noUnit')}
      disabled={disabled}
      className={className}
    />
  );
}
