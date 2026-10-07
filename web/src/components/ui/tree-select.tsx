// Library component "Select", Tree `picker` menu: a Select whose menu holds a search box, a Tree picker and an
// optional foot (e.g. the Checkbox "Gồm các đơn vị con"). The first row stands for "all" when `allLabel` is given.
// Popover, focus return and Esc come from Radix; the tree keyboard from the Tree picker.
import { ChevronDown, Search } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { TreePicker, type TreePickerNode } from './tree-picker';
import { filterNodes, findName, fold, parentIds, pathTo } from './tree-select-nodes';

export type TreeSelectProps = {
  /** Names the control, before its value: "Đơn vị tổ chức". */
  label: string;
  nodes: TreePickerNode[];
  /** Id of the chosen node; `''` is the "all" row (or nothing chosen). */
  value: string;
  onChange: (id: string) => void;
  /** First row, chosen when `value` is `''`: "Tất cả đơn vị". */
  allLabel?: string;
  /** Shown when nothing is chosen and there is no "all" row. */
  placeholder?: string;
  /** The search box over the tree: "Tìm đơn vị". */
  searchLabel: string;
  /** When the search matches no row. */
  noMatchText: string;
  /** Neutral Badges after names, e.g. on inactive units. */
  tags?: Readonly<Record<string, string>>;
  /** Below the tree, after a separator. */
  foot?: ReactNode;
  /** Links the control to a Field label. */
  id?: string;
  disabled?: boolean;
  className?: string;
};

/** The id of the "all" row inside the tree. */
const ALL = '*';

export function TreeSelect({ label, nodes, value, onChange, allLabel, placeholder = '', searchLabel, noMatchText, tags, foot, id, disabled, className }: TreeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const treeRef = useRef<HTMLDivElement>(null);
  const shown = (value && findName(nodes, value)) || allLabel || placeholder;

  const openChange = (next: boolean) => {
    // Each opening starts from the chosen row: its branch open, no search.
    if (next) {
      setQuery('');
      setExpanded(new Set(pathTo(nodes, value) ?? []));
    }
    setOpen(next);
  };
  const needle = fold(query);
  const visible = needle ? filterNodes(nodes, needle) : nodes;
  const rows = allLabel && !needle ? [{ id: ALL, name: allLabel, children: [] }, ...visible] : visible;
  const choose = (chosen: string) => {
    onChange(chosen === ALL ? '' : chosen);
    setOpen(false);
  };
  const toggle = (nodeId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(nodeId)) next.add(nodeId);
      return next;
    });

  return (
    <Popover.Root open={open} onOpenChange={openChange}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        aria-label={`${label}: ${shown}`}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3 text-left text-ink',
          'focus-visible:border-brand-blue data-[state=open]:border-brand-blue data-[state=open]:shadow-focus-ring',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', !value && !allLabel && 'text-ink-muted')}>{shown}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 stroke-[1.5] text-ink-muted" />
      </Popover.Trigger>
      <Popover.Portal>
        {/* Above a Dialog (z-50), like the Select menu; never wider than the viewport. */}
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={16}
          aria-label={label}
          className="z-60 flex w-90 max-w-[calc(100vw-2rem)] flex-col rounded-md border border-line bg-surface shadow-lg"
        >
          <div className="p-2">
            <Input
              type="search"
              aria-label={searchLabel}
              placeholder={searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // Down from the box goes into the tree, to the row that holds the tab stop.
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown') return;
                event.preventDefault();
                treeRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
              }}
              leading={<Search aria-hidden="true" />}
              wrapperClassName="max-md:h-11"
              className="[&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          {rows.length > 0 ? (
            <TreePicker
              ref={treeRef}
              label={label}
              nodes={rows}
              expandedIds={needle ? new Set(parentIds(visible)) : expanded}
              value={value || (allLabel ? ALL : null)}
              onChange={choose}
              onToggle={toggle}
              tags={tags}
              className="rounded-none border-0 pb-1"
            />
          ) : (
            <p role="status" className="px-4 pt-2 pb-4 text-caption text-ink-muted">
              {noMatchText}
            </p>
          )}
          {foot ? <div className="border-t border-line px-3 py-2">{foot}</div> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
