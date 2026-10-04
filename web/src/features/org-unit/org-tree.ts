// Pure model of the org tree: the company root with its units nested, and the search and inactive filters.
import type { OrgStructure, OrgUnitHead, OrgUnitType } from './api';

/** Id of the company node, which the API sends without one. */
export const ROOT_ID = 'root';

export type OrgNode = {
  id: string;
  /** `null` on the company node. */
  code: string | null;
  name: string;
  type: OrgUnitType | 'COMPANY';
  /** `null` on the company node; `ROOT_ID` for a top-level unit. */
  parentId: string | null;
  active: boolean;
  head: OrgUnitHead | null;
  headcountDirect: number;
  headcountTotal: number;
  children: OrgNode[];
  /** Set by `filterTree`: kept only as the ancestor of a search match. */
  muted?: boolean;
};

/** Nests the flat unit list under the company node, keeping the API's sibling order. */
export function buildTree({ root, units }: OrgStructure): OrgNode {
  const top: OrgNode = { ...root, id: ROOT_ID, code: null, parentId: null, active: true, children: [] };
  const byId = new Map<string, OrgNode>([[ROOT_ID, top]]);
  for (const unit of units) byId.set(unit.id, { ...unit, parentId: unit.parentId ?? ROOT_ID, children: [] });
  for (const unit of units) (byId.get(unit.parentId ?? ROOT_ID) ?? top).children.push(byId.get(unit.id)!);
  return top;
}

export function findNode(node: OrgNode, id: string | null): OrgNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Ids of the nodes above `id`, nearest first; empty for the company node or an unknown id. */
export function ancestorIds(root: OrgNode, id: string): string[] {
  const parentId = findNode(root, id)?.parentId;
  return parentId ? [parentId, ...ancestorIds(root, parentId)] : [];
}

/** The company and every active unit, in tree order: where a unit may be added. `level` counts the listed nodes above. */
export function parentChoices(node: OrgNode, level = 0): { id: string; name: string; level: number }[] {
  if (!node.active) return node.children.flatMap((child) => parentChoices(child, level));
  return [{ id: node.id, name: node.name, level }, ...node.children.flatMap((child) => parentChoices(child, level + 1))];
}

/** How many nodes of a filtered tree match the search themselves (the `muted` ancestors do not). */
export function countMatches(node: OrgNode | null): number {
  return node ? (node.muted ? 0 : 1) + node.children.reduce((sum, child) => sum + countMatches(child), 0) : 0;
}

/** Ids of the nodes that have children, i.e. everything that can be expanded. */
export function parentIds(node: OrgNode): string[] {
  return node.children.length > 0 ? [node.id, ...node.children.flatMap(parentIds)] : [];
}

/** Lower case, without Vietnamese diacritics: "Đà Nẵng" → "da nang". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
}

export type TreeFilter = { query: string; showInactive: boolean };

/**
 * Keeps the nodes that match the query by name or code (and pass the inactive toggle) plus their ancestors;
 * an ancestor that does not match itself is `muted`. Without a query the company node always stays.
 * Returns `null` when a query matches nothing.
 */
export function filterTree(root: OrgNode, { query, showInactive }: TreeFilter): OrgNode | null {
  const needle = normalize(query);
  const visit = (node: OrgNode): OrgNode | null => {
    const children = node.children.map(visit).filter((child) => child !== null);
    const matches = !needle || normalize(node.name).includes(needle) || normalize(node.code ?? '').includes(needle);
    const own = matches && (showInactive || node.active);
    if (!own && children.length === 0) return null;
    return { ...node, children, muted: Boolean(needle) && !matches };
  };
  return visit(root);
}
