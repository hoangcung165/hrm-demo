// Filter "Đơn vị tổ chức": the org tree in a Select menu with a search box, "Tất cả đơn vị" first, inactive units
// tagged (they can still be chosen), and the Checkbox "Gồm các đơn vị con" (on by default) in the menu foot.
// Needs ORG_VIEW, which reads the tree.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import type { TreePickerNode } from '@/components/ui/tree-picker';
import { TreeSelect } from '@/components/ui/tree-select';
import { useOrgStructure } from '@/features/org-unit/api';
import { buildTree } from '@/features/org-unit/org-tree';
import type { EmployeeFilters } from '../use-employee-filters';

export type EmployeeUnitFilterProps = {
  filters: EmployeeFilters;
  /** Links the control to a Field label (the filter dialog at 390). */
  id?: string;
  disabled?: boolean;
  className?: string;
};

export function EmployeeUnitFilter({ filters, id, disabled, className }: EmployeeUnitFilterProps) {
  const { t } = useTranslation();
  const structure = useOrgStructure();
  const { nodes, tags } = useMemo<{ nodes: TreePickerNode[]; tags: Record<string, string> }>(() => {
    if (!structure.data) return { nodes: [], tags: {} };
    const inactive = structure.data.units.filter((unit) => !unit.active);
    return { nodes: buildTree(structure.data).children, tags: Object.fromEntries(inactive.map((unit) => [unit.id, t('employees.unitInactive')])) };
  }, [structure.data, t]);
  return (
    <TreeSelect
      id={id}
      label={t('employees.filter.unit')}
      nodes={nodes}
      value={filters.query.orgUnitId}
      onChange={filters.setOrgUnit}
      allLabel={t('employees.filter.allUnits')}
      searchLabel={t('employees.filter.findUnit')}
      noMatchText={t('employees.filter.noUnit')}
      tags={tags}
      disabled={disabled}
      className={className}
      foot={
        <Checkbox checked={filters.query.includeSubUnits} onChange={(event) => filters.setIncludeSubUnits(event.target.checked)} className="min-h-9 max-md:min-h-11">
          {t('employees.filter.includeSubUnits')}
        </Checkbox>
      }
    />
  );
}
