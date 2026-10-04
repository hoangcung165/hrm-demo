// Library component "Tree": a hierarchy as indented rows that expand and collapse (Cơ cấu tổ chức).
// Variants built so far: default and `compact` (below 768px). The `picker` variant comes with the move dialog (HRM-03/FE-3).
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { TreeRow } from './tree-row';

export type TreeNode = {
  id: string;
  name: string;
  /** Accessible name of the row: every cell in one sentence, e.g. "Phòng Kinh doanh, Phòng ban, Trưởng đơn vị: Đinh Công Sơn, 20 nhân viên". */
  ariaLabel: string;
  typeLabel: string;
  /** `null` when nobody is assigned. */
  head: { name: string; avatarUrl?: string | null } | null;
  number: number;
  active: boolean;
  /** Search: an ancestor kept only to show where a match sits. */
  muted?: boolean;
  children: TreeNode[];
};

/** Column headers, and the text of the inactive Badge and of a vacant head. */
export type TreeLabels = { unit: string; type: string; head: string; number: string; inactive: string; vacant: string };

export type TreeProps = {
  /** Accessible name of the tree, e.g. "Cây đơn vị"; while loading, of the busy region: "Đang tải cây đơn vị". */
  label: string;
  nodes: TreeNode[];
  expandedIds: ReadonlySet<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  labels: TreeLabels;
  toolbar?: ReactNode;
  variant?: 'default' | 'compact';
  /** Skeleton rows instead of nodes. */
  loading?: boolean;
  /** A State block under the rows (empty) or instead of them (no match). */
  children?: ReactNode;
  className?: string;
};

type VisibleRow = { node: TreeNode; level: number; parentId: string | null };

function visibleRows(nodes: TreeNode[], expandedIds: ReadonlySet<string>, level = 1, parentId: string | null = null): VisibleRow[] {
  return nodes.flatMap((node) => [
    { node, level, parentId },
    ...(expandedIds.has(node.id) ? visibleRows(node.children, expandedIds, level + 1, node.id) : []),
  ]);
}

const SKELETON_ROWS = [
  { level: 0, width: 'w-[70%]' },
  { level: 1, width: 'w-[62%]' },
  { level: 2, width: 'w-[40%]' },
  { level: 2, width: 'w-[46%]' },
  { level: 1, width: 'w-[56%]' },
  { level: 1, width: 'w-[50%]' },
  { level: 2, width: 'w-[44%]' },
  { level: 1, width: 'w-[60%]' },
];

export function Tree(props: TreeProps) {
  const { label, nodes, expandedIds, selectedId, onToggle, onSelect, labels, toolbar, variant = 'default', loading = false } = props;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // A selection made outside the tree (a link, the URL) moves the tab stop to the selected row.
  const [lastSelectedId, setLastSelectedId] = useState(selectedId);
  if (lastSelectedId !== selectedId) {
    setLastSelectedId(selectedId);
    setFocusedId(selectedId);
  }
  const compact = variant === 'compact';
  const rows = visibleRows(nodes, expandedIds);
  const has = (id: string | null) => rows.some((row) => row.node.id === id);
  const tabbableId = has(focusedId) ? focusedId : has(selectedId) ? selectedId : rows[0]?.node.id;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
    const select = event.key === 'Enter' || event.key === ' ';
    if (!(event.key in goTo) && !select) return;
    // Also keeps Space from scrolling the page.
    event.preventDefault();
    if (select) onSelect(row.node.id);
    else if (parent && ((event.key === 'ArrowRight' && !open) || (event.key === 'ArrowLeft' && open))) onToggle(row.node.id);
    else if (goTo[event.key]) event.currentTarget.querySelector<HTMLElement>(`[data-tree-id="${goTo[event.key]}"]`)?.focus();
  };

  const cols = (
    <div
      aria-hidden="true"
      className="flex h-8 items-center gap-3 border-b border-line bg-surface-muted pr-4 pl-2 text-caption text-ink-muted"
    >
      <span className={cn('min-w-0 flex-1', compact ? 'pl-9' : 'pl-7')}>{labels.unit}</span>
      {compact ? null : <span className="w-21 shrink-0">{labels.type}</span>}
      {compact ? null : <span className="w-44 shrink-0">{labels.head}</span>}
      {/* Right edge on the numbers; a label wider than the column (en "Employees") grows to the left. */}
      <span className="flex w-15 shrink-0 justify-end whitespace-nowrap">{labels.number}</span>
    </div>
  );

  return (
    // With rows the name goes on the tree alone; without them (loading, no match) on the section.
    <section aria-label={loading || rows.length === 0 ? label : undefined} aria-busy={loading || undefined} className={cn('overflow-hidden rounded-md border border-line bg-surface', props.className)}>
      {toolbar ? <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">{toolbar}</div> : null}
      {loading || rows.length > 0 ? cols : null}
      {loading ? (
        SKELETON_ROWS.map((row, index) => (
          <div key={index} className={cn('flex items-center gap-3 border-b border-line pr-4 pl-2 last:border-b-0', compact ? 'min-h-11' : 'min-h-10')}>
            <span className="flex-1" style={{ paddingLeft: `calc(${row.level} * (var(--space-4) + var(--space-1)) + var(--space-6) + var(--space-1))` }}>
              <Skeleton className={row.width} />
            </span>
            <Skeleton className="w-6" />
          </div>
        ))
      ) : rows.length > 0 ? (
        <div role="tree" aria-label={label} onKeyDown={onKeyDown} className={cn(props.children && 'border-b border-line')}>
          {rows.map(({ node, level }) => (
            <TreeRow
              key={node.id}
              node={node}
              level={level}
              expanded={expandedIds.has(node.id)}
              selected={node.id === selectedId}
              tabbable={node.id === tabbableId}
              compact={compact}
              labels={labels}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={setFocusedId}
            />
          ))}
        </div>
      ) : null}
      {loading ? null : props.children}
    </section>
  );
}
