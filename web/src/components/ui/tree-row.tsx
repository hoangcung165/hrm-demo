// One row of the library component "Tree": twist, name, and the type, head and number cells.
import { Ban, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Person } from './person';
import type { TreeLabels, TreeNode } from './tree';

export type TreeRowProps = {
  node: TreeNode;
  /** 1 for the top row. */
  level: number;
  expanded: boolean;
  selected: boolean;
  /** The one row in the tab order (roving focus). */
  tabbable: boolean;
  compact: boolean;
  labels: Pick<TreeLabels, 'inactive' | 'vacant'>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
};

export function TreeRow({ node, level, expanded, selected, tabbable, compact, labels, onToggle, onSelect, onFocus }: TreeRowProps) {
  const { t } = useTranslation();
  const hasChildren = node.children.length > 0;
  const muted = !node.active || node.muted;
  const twist = cn('grid shrink-0 place-items-center', compact ? 'h-11 w-8' : 'size-6');
  return (
    <div
      role="treeitem"
      data-tree-id={node.id}
      aria-label={node.ariaLabel}
      aria-level={level}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onSelect(node.id)}
      onFocus={() => onFocus(node.id)}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b border-line pr-4 pl-2 outline-none last:border-b-0 focus-visible:inset-ring-2 focus-visible:inset-ring-brand-blue',
        compact ? 'min-h-11' : 'min-h-10',
        selected ? 'bg-brand-blue-soft' : 'hover:bg-surface-muted',
      )}
    >
      <span
        className="flex min-w-0 flex-1 items-center gap-1"
        style={{ paddingLeft: `calc(${level - 1} * (var(--space-4) + var(--space-1)))` }}
      >
        {hasChildren ? (
          <button
            type="button"
            // A mouse-only shortcut, named by its tooltip: the treeitem carries `aria-expanded` and the arrow keys toggle it.
            aria-hidden="true"
            tabIndex={-1}
            title={t(expanded ? 'tree.collapse' : 'tree.expand', { name: node.name })}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
              // Focus goes back to the row, so the arrow keys keep working after a click.
              event.currentTarget.closest<HTMLElement>('[data-tree-id]')?.focus();
            }}
            className={cn(twist, 'cursor-pointer rounded-sm text-ink-muted hover:bg-line hover:text-ink [&_svg]:size-4 [&_svg]:stroke-[1.5]')}
          >
            {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
        ) : (
          <span className={twist} />
        )}
        {/* Compact: the Badge goes under the name, so a narrow row does not squeeze the name away. */}
        <span className={cn('flex min-w-0', compact ? 'flex-col items-start gap-1 py-2' : 'items-center gap-2')}>
          <span title={node.name} className={cn('max-w-full min-w-12 truncate', muted && 'text-ink-muted', !node.muted && 'font-medium')}>
            {node.name}
          </span>
          {node.active ? null : (
            <Badge variant="neutral" className="shrink-0">
              <Ban aria-hidden="true" />
              {labels.inactive}
            </Badge>
          )}
        </span>
      </span>
      {compact ? null : (
        <>
          <span className="w-21 shrink-0 whitespace-nowrap text-ink-muted">{node.typeLabel}</span>
          <span className="flex w-44 min-w-0 shrink-0">
            {node.head ? (
              <Person name={node.head.name} src={node.head.avatarUrl} />
            ) : node.active ? (
              <Person vacant name={labels.vacant} />
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </span>
        </>
      )}
      <span className={cn('w-15 shrink-0 text-right tabular-nums', !node.active && 'text-ink-muted')}>{formatNumber(node.number)}</span>
    </div>
  );
}
