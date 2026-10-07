// The units a new Employee can be put in: active ones only (a unit under an inactive unit hangs from the nearest
// listed unit above), and for an Account with data scope ORG_UNIT only the units of its scope.
import type { TreePickerNode } from '@/components/ui/tree-picker';
import type { OrgStructure } from '@/features/org-unit/api';
import { buildTree, type OrgNode } from '@/features/org-unit/org-tree';

export function unitChoices(structure: OrgStructure, allowed?: ReadonlySet<string>): TreePickerNode[] {
  const visit = (node: OrgNode): TreePickerNode[] => {
    const children = node.children.flatMap(visit);
    if (!node.active || (allowed && !allowed.has(node.id))) return children;
    return [{ id: node.id, name: node.name, children }];
  };
  return buildTree(structure).children.flatMap(visit);
}

/** The names from the top unit down to the unit `id`: "Phòng Phát triển phần mềm › Nhóm Kiểm thử". */
export function unitPath(structure: OrgStructure, id: string): string {
  const byId = new Map(structure.units.map((unit) => [unit.id, unit]));
  const names: string[] = [];
  for (let unit = byId.get(id); unit; unit = unit.parentId ? byId.get(unit.parentId) : undefined) names.unshift(unit.name);
  return names.join(' › ');
}
