// View state of the unit tree: search, the inactive toggle and which nodes are collapsed (everything is open by default).
import { useMemo, useState } from 'react';
import { ancestorIds, countMatches, filterTree, parentIds, ROOT_ID, type OrgNode } from './org-tree';

export function useOrgTreeView(root: OrgNode, selectedId: string) {
  const [query, setQueryState] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  // A new selection (a detail link, the URL) opens the units above it, so the selected row is in view.
  const [lastSelectedId, setLastSelectedId] = useState(selectedId);
  if (lastSelectedId !== selectedId) {
    setLastSelectedId(selectedId);
    const above = ancestorIds(root, selectedId);
    if (above.some((id) => collapsed.has(id))) setCollapsed(new Set([...collapsed].filter((id) => !above.includes(id))));
  }

  const visibleRoot = useMemo(() => filterTree(root, { query, showInactive }), [root, query, showInactive]);
  const parents = useMemo(() => (visibleRoot ? parentIds(visibleRoot) : []), [visibleRoot]);
  const expandedIds = useMemo(() => new Set(parents.filter((id) => !collapsed.has(id))), [parents, collapsed]);
  // "Thu gọn tất cả" keeps the company node open, so the first level stays in view.
  const collapsible = parents.filter((id) => id !== ROOT_ID);

  return {
    query,
    /** A new search opens every level, so no match hides inside a collapsed unit. */
    setQuery: (value: string) => {
      setQueryState(value);
      if (value.trim()) setCollapsed(new Set());
    },
    showInactive,
    setShowInactive,
    visibleRoot,
    /** Nodes that match the search; ancestors kept only for context are not counted. */
    matchCount: useMemo(() => countMatches(visibleRoot), [visibleRoot]),
    expandedIds,
    allCollapsed: collapsible.length > 0 && collapsible.every((id) => collapsed.has(id)),
    canCollapse: collapsible.length > 0,
    toggle: (id: string) =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    collapseAll: () => setCollapsed(new Set(collapsible)),
    expandAll: () => setCollapsed(new Set()),
  };
}
