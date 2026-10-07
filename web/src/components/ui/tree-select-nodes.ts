// Pure helpers of the Tree `picker` menu of Select: search without accents, the branch of the chosen node.
import type { TreePickerNode } from './tree-picker';

/** Lower case, without Vietnamese diacritics: "Đà Nẵng" → "da nang". */
export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();

/** The nodes whose name matches, with their ancestors. */
export function filterNodes(nodes: TreePickerNode[], needle: string): TreePickerNode[] {
  return nodes.flatMap((node) => {
    const children = filterNodes(node.children, needle);
    return fold(node.name).includes(needle) || children.length > 0 ? [{ ...node, children }] : [];
  });
}

/** Ids of the nodes that have children: everything that can be expanded. */
export const parentIds = (nodes: TreePickerNode[]): string[] => nodes.flatMap((node) => (node.children.length > 0 ? [node.id, ...parentIds(node.children)] : []));

/** Ids from the top down to the node `id`, without it; `null` when it is not in the tree. */
export function pathTo(nodes: TreePickerNode[], id: string): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return [];
    const below = pathTo(node.children, id);
    if (below) return [node.id, ...below];
  }
  return null;
}

/** The name of the node `id`, anywhere in the tree. */
export const findName = (nodes: TreePickerNode[], id: string): string | undefined =>
  nodes.reduce<string | undefined>((found, node) => found ?? (node.id === id ? node.name : findName(node.children, id)), undefined);
