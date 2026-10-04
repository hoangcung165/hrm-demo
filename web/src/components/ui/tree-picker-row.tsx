// One row of the Tree `picker` variant: Radio, twist, name, and the reason when the row cannot be chosen.
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { TreePickerNode } from './tree-picker';

export type TreePickerRowProps = {
  node: TreePickerNode;
  /** 1 for the top row. */
  level: number;
  expanded: boolean;
  checked: boolean;
  /** Why the row cannot be chosen; `undefined` when it can. */
  disabledReason: string | undefined;
  /** The one row in the tab order (roving focus). */
  tabbable: boolean;
  onToggle: (id: string) => void;
  onChoose: (id: string) => void;
  onFocus: (id: string) => void;
};

export function TreePickerRow({ node, level, expanded, checked, disabledReason, tabbable, onToggle, onChoose, onFocus }: TreePickerRowProps) {
  const { t } = useTranslation();
  const id = useId();
  const hasChildren = node.children.length > 0;
  const disabled = disabledReason !== undefined;
  return (
    <div
      role="treeitem"
      data-tree-id={node.id}
      // The name alone names the row; the reason is its description, so it is read after the name and the state.
      aria-labelledby={`${id}-name`}
      aria-describedby={disabled ? `${id}-note` : undefined}
      aria-level={level}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      // A disabled row stays reachable with the arrow keys, so its reason can be heard; it cannot be chosen.
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onChoose(node.id)}
      onFocus={() => onFocus(node.id)}
      className={cn(
        'flex min-h-9 items-center gap-2 pr-4 pl-3 outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-brand-blue max-md:min-h-11',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        checked ? 'bg-brand-blue-soft' : !disabled && 'hover:bg-surface-muted',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-4.5 shrink-0 place-items-center rounded-full border-[1.5px] bg-surface',
          checked ? 'border-brand-blue' : 'border-ink-muted',
          disabled && 'opacity-45',
        )}
      >
        {checked ? <span className="size-2 rounded-full bg-brand-blue" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1" style={{ paddingLeft: `calc(${level - 1} * var(--space-4))` }}>
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
              event.currentTarget.closest<HTMLElement>('[data-tree-id]')?.focus();
            }}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-line hover:text-ink max-md:h-11 max-md:w-8 [&_svg]:size-4 [&_svg]:stroke-[1.5]"
          >
            {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
        ) : (
          <span className="size-6 shrink-0 max-md:w-8" />
        )}
        <span id={`${id}-name`} title={node.name} className={cn('min-w-0 truncate', disabled ? 'text-ink-muted' : 'font-medium')}>
          {node.name}
        </span>
      </span>
      {disabled ? (
        <span id={`${id}-note`} className="shrink-0 text-caption text-ink-muted">
          {disabledReason}
        </span>
      ) : null}
    </div>
  );
}
