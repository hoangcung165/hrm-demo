// The child units of one card of the library component "Org chart", with their connectors:
// the company's children in one row, every deeper level stacked under its parent.
import { cn } from '@/lib/utils';
import type { OrgChartLabels, OrgChartNode } from './org-chart';
import { OrgChartNodeCard } from './org-chart-node';

/** What every card of the chart needs; passed down unchanged. */
export type OrgChartCardContext = {
  expandedIds: ReadonlySet<string>;
  selectedId: string | null;
  tabbableId: string | null | undefined;
  labels: OrgChartLabels;
  hrefFor?: (id: string) => string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
};

export type OrgChartBranchProps = {
  nodes: OrgChartNode[];
  /** `aria-level` of these cards: 2 for the row under the company. */
  level: number;
  context: OrgChartCardContext;
};

// Connectors are 1px `ink-muted` pseudo-elements, as in the library CSS (`.hrm-org-row`, `.hrm-org-stack`).
// Row: a drop from the company, then per column half a bar to each side and a drop into the card.
const ROW = 'relative flex justify-center pt-4 before:absolute before:top-0 before:left-1/2 before:h-4 before:border-l before:border-ink-muted';
const ROW_ITEM = cn(
  'relative flex w-[calc(var(--hrm-org-col)+var(--space-2))] flex-none flex-col px-1 pt-4',
  'before:absolute before:top-0 before:right-1/2 before:h-4 before:w-1/2 before:border-t before:border-ink-muted first:before:border-t-0',
  'after:absolute after:top-0 after:left-1/2 after:h-4 after:w-1/2 after:border-t after:border-l after:border-ink-muted last:after:border-t-0',
);
// Stack: a spine `space-2` in from the parent's left edge, with an elbow into each card.
const STACK = 'flex flex-col gap-2 pt-2 pl-4';
const STACK_ITEM = cn(
  'relative flex flex-col',
  'before:absolute before:-top-2 before:-left-2 before:h-8 before:w-2 before:rounded-bl-sm before:border-b before:border-l before:border-ink-muted',
  'not-last:after:absolute not-last:after:top-0 not-last:after:-bottom-2 not-last:after:-left-2 not-last:after:border-l not-last:after:border-ink-muted',
);

export function OrgChartBranch({ nodes, level, context }: OrgChartBranchProps) {
  const row = level === 2;
  return (
    <ul role="group" className={row ? ROW : STACK}>
      {nodes.map((node) => {
        const expanded = context.expandedIds.has(node.id);
        return (
          <li key={node.id} role="none" className={row ? ROW_ITEM : STACK_ITEM}>
            <OrgChartNodeCard
              node={node}
              variant={row ? 'row' : 'stack'}
              level={level}
              expanded={expanded}
              selected={node.id === context.selectedId}
              tabbable={node.id === context.tabbableId}
              labels={context.labels}
              href={context.hrefFor?.(node.id)}
              onToggle={context.onToggle}
              onOpen={context.onOpen}
              onFocus={context.onFocus}
            />
            {expanded && node.children.length > 0 ? <OrgChartBranch nodes={node.children} level={level + 1} context={context} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
