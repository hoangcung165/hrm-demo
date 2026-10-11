// Filter "Phòng ban phụ trách": the org tree in a Select menu with a search box, "Tất cả phòng ban" first, inactive
// units tagged. Only the owning unit itself matches, not the units below it.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TreePickerNode } from '@/components/ui/tree-picker';
import { TreeSelect } from '@/components/ui/tree-select';
import { unitTree } from '@/features/employee/unit-choices';
import { useOrgUnitOptions } from '@/features/org-unit/api';
import type { ProjectFilters } from '../use-project-filters';

export type ProjectUnitFilterProps = {
  filters: ProjectFilters;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export function ProjectUnitFilter({ filters, id, disabled, className }: ProjectUnitFilterProps) {
  const { t } = useTranslation();
  const units = useOrgUnitOptions();
  const { nodes, tags } = useMemo<{ nodes: TreePickerNode[]; tags: Record<string, string> }>(() => {
    if (!units.data) return { nodes: [], tags: {} };
    const inactive = units.data.filter((unit) => !unit.active);
    return { nodes: unitTree(units.data), tags: Object.fromEntries(inactive.map((unit) => [unit.id, t('projects.filter.unitInactive')])) };
  }, [units.data, t]);
  return (
    <TreeSelect
      id={id}
      label={t('projects.filter.unit')}
      nodes={nodes}
      value={filters.query.orgUnitId}
      onChange={filters.setOrgUnit}
      allLabel={t('projects.filter.allUnits')}
      searchLabel={t('projects.filter.findUnit')}
      noMatchText={t('projects.filter.noUnit')}
      tags={tags}
      disabled={disabled}
      className={className}
    />
  );
}
