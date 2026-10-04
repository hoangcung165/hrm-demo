// Library component "Tree", `picker` variant: choosing one node in a Dialog. A Radio leads each row; a row that cannot
// be chosen says why. Semantics: `role="tree"` with `treeitem` rows as the README asks; the single choice is
// `aria-checked` on the rows (it matches the visible Radio), disabled rows carry `aria-disabled` and their reason as description.
import type { Ref } from 'react';
import { cn } from '@/lib/utils';
import { TreePickerRow } from './tree-picker-row';
import { useTreeNavigation } from './use-tree-navigation';

export type TreePickerNode = { id: string; name: string; children: TreePickerNode[] };

export type TreePickerProps = {
  /** Accessible name of the tree: the label of its field, e.g. "Đơn vị cha mới". */
  label: string;
  nodes: TreePickerNode[];
  expandedIds: ReadonlySet<string>;
  /** Id of the chosen node, `null` before a choice. */
  value: string | null;
  onChange: (id: string) => void;
  onToggle: (id: string) => void;
  /** Rows that cannot be chosen, with the reason shown on the right: `{ [id]: "Đơn vị cha hiện tại" }`. */
  disabled?: Readonly<Record<string, string>>;
  /** Field wiring, as `Field` hands it to its control. */
  id?: string;
  'aria-describedby'?: string;
  'aria-required'?: true;
  invalid?: boolean;
  ref?: Ref<HTMLDivElement>;
  className?: string;
};

export function TreePicker({ label, nodes, expandedIds, value, onChange, onToggle, disabled = {}, id, invalid = false, ref, className, ...aria }: TreePickerProps) {
  const choose = (nodeId: string) => {
    if (!(nodeId in disabled)) onChange(nodeId);
  };
  const { rows, tabbableId, setFocusedId, onKeyDown } = useTreeNavigation({ nodes, expandedIds, currentId: value, onToggle, onChoose: choose });
  return (
    <div
      ref={ref}
      id={id}
      role="tree"
      aria-label={label}
      aria-invalid={invalid || undefined}
      {...aria}
      onKeyDown={onKeyDown}
      // 296px is the height the design system gives the picker before it scrolls; there is no size token for it.
      className={cn('max-h-[296px] overflow-y-auto rounded-sm border bg-surface', invalid ? 'border-danger' : 'border-line', className)}
    >
      {rows.map(({ node, level }) => (
        <TreePickerRow
          key={node.id}
          node={node}
          level={level}
          expanded={expandedIds.has(node.id)}
          checked={node.id === value}
          disabledReason={disabled[node.id]}
          tabbable={node.id === tabbableId}
          onToggle={onToggle}
          onChoose={choose}
          onFocus={setFocusedId}
        />
      ))}
    </div>
  );
}
