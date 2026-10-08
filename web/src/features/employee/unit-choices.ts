// The org units of the employee screens, from GET /api/org-units/options (open to EMPLOYEE_VIEW): the tree of the
// unit filter, and the units an Employee can be put in. Active units only there (a unit under an inactive unit hangs
// from the nearest listed unit above), and for an Account with data scope ORG_UNIT only the units of its scope.
// On edit the Employee's current unit stays listed even when it was deactivated since.
import type { TreePickerNode } from '@/components/ui/tree-picker';
import type { OrgUnitOption } from '@/features/org-unit/api';

type UnitNode = TreePickerNode & { active: boolean; children: UnitNode[] };

/** The units nested under their parents; the API lists parents before children. */
function nest(units: OrgUnitOption[]): UnitNode[] {
  const byId = new Map(units.map((unit) => [unit.id, { id: unit.id, name: unit.name, active: unit.active, children: [] as UnitNode[] }]));
  const top: UnitNode[] = [];
  for (const unit of units) (byId.get(unit.parentId ?? '')?.children ?? top).push(byId.get(unit.id)!);
  return top;
}

/** Every unit, inactive ones included: the unit filter of the list. */
export const unitTree = (units: OrgUnitOption[]): TreePickerNode[] => nest(units);

export function unitChoices(units: OrgUnitOption[], allowed?: ReadonlySet<string>, keepId?: string | null): TreePickerNode[] {
  const visit = (node: UnitNode): TreePickerNode[] => {
    const children = node.children.flatMap(visit);
    if (node.id !== keepId && (!node.active || (allowed && !allowed.has(node.id)))) return children;
    return [{ id: node.id, name: node.name, children }];
  };
  return nest(units).flatMap(visit);
}

/** The names from the top unit down to the unit `id`: "Phòng Phát triển phần mềm › Nhóm Kiểm thử". */
export function unitPath(units: OrgUnitOption[], id: string): string {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const names: string[] = [];
  for (let unit = byId.get(id); unit; unit = unit.parentId ? byId.get(unit.parentId) : undefined) names.unshift(unit.name);
  return names.join(' › ');
}
