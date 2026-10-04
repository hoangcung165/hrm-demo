// Keyboard model shared by the Tree variants: one row in the tab order (roving focus), arrows between the visible rows,
// Right/Left to expand, collapse or step to the first child or the parent, Home/End, Enter or Space to choose.
import { useState, type KeyboardEvent } from 'react';

type Nested<N> = { id: string; children: N[] };
export type VisibleTreeRow<N> = { node: N; level: number; parentId: string | null };

function visibleRows<N extends Nested<N>>(nodes: N[], expandedIds: ReadonlySet<string>, level = 1, parentId: string | null = null): VisibleTreeRow<N>[] {
  return nodes.flatMap((node) => [
    { node, level, parentId },
    ...(expandedIds.has(node.id) ? visibleRows(node.children, expandedIds, level + 1, node.id) : []),
  ]);
}

export type TreeNavigationOptions<N> = {
  nodes: N[];
  expandedIds: ReadonlySet<string>;
  /** The selected (or chosen) row: it holds the tab stop until another row takes focus. */
  currentId: string | null;
  onToggle: (id: string) => void;
  /** Enter or Space on a row. */
  onChoose: (id: string) => void;
};

/** Rows carry `data-tree-id`; put `onKeyDown` on their container and `onFocus={setFocusedId}` on each row. */
export function useTreeNavigation<N extends Nested<N>>({ nodes, expandedIds, currentId, onToggle, onChoose }: TreeNavigationOptions<N>) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // A choice made outside the tree (a link, the URL) moves the tab stop to that row.
  const [lastCurrentId, setLastCurrentId] = useState(currentId);
  if (lastCurrentId !== currentId) {
    setLastCurrentId(currentId);
    setFocusedId(currentId);
  }
  const rows = visibleRows(nodes, expandedIds);
  const has = (id: string | null) => rows.some((row) => row.node.id === id);
  const tabbableId = has(focusedId) ? focusedId : has(currentId) ? currentId : rows[0]?.node.id;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-id]')?.dataset.treeId;
    const index = rows.findIndex((row) => row.node.id === id);
    const row = rows[index];
    if (!row) return;
    const open = expandedIds.has(row.node.id);
    const parent = row.node.children.length > 0;
    const goTo: Record<string, string | undefined> = {
      ArrowDown: rows[index + 1]?.node.id,
      ArrowUp: rows[index - 1]?.node.id,
      Home: rows[0]?.node.id,
      End: rows[rows.length - 1]?.node.id,
      ArrowRight: parent && open ? row.node.children[0]?.id : undefined,
      ArrowLeft: parent && open ? undefined : (row.parentId ?? undefined),
    };
    const choose = event.key === 'Enter' || event.key === ' ';
    if (!(event.key in goTo) && !choose) return;
    // Also keeps Space from scrolling the page, and Enter from submitting a form around the tree.
    event.preventDefault();
    if (choose) onChoose(row.node.id);
    else if (parent && ((event.key === 'ArrowRight' && !open) || (event.key === 'ArrowLeft' && open))) onToggle(row.node.id);
    else if (goTo[event.key]) event.currentTarget.querySelector<HTMLElement>(`[data-tree-id="${goTo[event.key]}"]`)?.focus();
  };

  return { rows, tabbableId, setFocusedId, onKeyDown };
}
