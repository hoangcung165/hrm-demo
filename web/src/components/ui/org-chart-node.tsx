// One card of the library component "Org chart": name link, type and code, head, headcount and the children toggle.
import { Ban, ChevronDown, ChevronUp, Users } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import type { OrgChartLabels, OrgChartNode } from './org-chart';
import { Person } from './person';

export type OrgChartNodeCardProps = {
  node: OrgChartNode;
  /** `root`: the company card; `row`: a first-level unit; `stack`: a deeper unit, denser and without the caption. */
  variant: 'root' | 'row' | 'stack';
  /** 1 for the company. */
  level: number;
  expanded: boolean;
  selected: boolean;
  /** The one card in the tab order (roving focus). */
  tabbable: boolean;
  labels: OrgChartLabels;
  href?: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
};

const CARD = 'relative flex flex-col rounded-md border outline-none hover:shadow-sm focus-visible:shadow-focus-ring';
// Long names wrap and are never cut. The link is a pointer shortcut: from the keyboard, Enter on the card opens the unit.
// Below md the link gets a 44px touch target: padding that a matching negative margin takes back, so the card keeps its layout.
const NAME = 'block font-medium [overflow-wrap:anywhere] hover:underline max-md:-my-2.75 max-md:py-2.75';

export function OrgChartNodeCard({ node, variant, level, expanded, selected, tabbable, labels, href, onToggle, onOpen, onFocus }: OrgChartNodeCardProps) {
  const root = variant === 'root';
  const stacked = variant === 'stack';
  const childCount = node.children.length;
  const caption = [node.typeLabel, node.code].filter(Boolean).join(' · ');
  const headcount = labels.headcount(node.headcount);

  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    // A modified click keeps its browser meaning (new tab, new window).
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(node.id);
  };
  const name = (
    <a href={href} tabIndex={-1} onClick={open} className={cn(NAME, !node.active && 'text-ink-muted')}>
      {node.name}
    </a>
  );

  return (
    <div
      role="treeitem"
      data-tree-id={node.id}
      aria-label={node.ariaLabel}
      aria-level={level}
      aria-selected={selected}
      aria-expanded={childCount > 0 ? expanded : undefined}
      tabIndex={tabbable ? 0 : -1}
      onFocus={() => onFocus(node.id)}
      className={cn(
        CARD,
        stacked ? 'gap-1 p-2' : 'gap-2 p-3',
        root ? 'w-74 border-brand-blue bg-brand-blue text-on-brand' : node.active ? 'border-line bg-surface' : 'border-dashed border-ink-muted bg-surface-muted',
        selected && 'border-brand-blue ring-1 ring-brand-blue',
      )}
    >
      {stacked ? (
        name
      ) : (
        // Two name lines and the caption: the cards of a row line up whatever the length of their names.
        <span className={cn('flex min-w-0 flex-col gap-0.5', !root && 'min-h-15.5')}>
          {name}
          <span className={cn('text-caption', !root && 'opacity-85')}>{caption}</span>
        </span>
      )}
      {node.active ? null : (
        <Badge variant="neutral" className="self-start">
          <Ban aria-hidden="true" />
          {labels.inactive}
        </Badge>
      )}
      {node.head ? (
        <Person wrapName name={node.head.name} src={node.head.avatarUrl} className={PERSON} />
      ) : node.active ? (
        <Person vacant wrapName name={labels.vacant} className={PERSON} />
      ) : null}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span title={headcount} className="inline-flex items-center gap-1 text-caption tabular-nums [&_svg]:size-4 [&_svg]:stroke-[1.5]">
          <Users aria-hidden="true" />
          <span aria-hidden="true">{formatNumber(node.headcount)}</span>
          <span className="sr-only">{headcount}</span>
        </span>
        {childCount > 0 && !root ? (
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={expanded}
            aria-label={(expanded ? labels.collapse : labels.expand)(childCount, node.name)}
            onClick={(event) => {
              onToggle(node.id);
              // Focus goes back to the card, so the arrow keys and Space keep working after a click.
              event.currentTarget.closest<HTMLElement>('[data-tree-id]')?.focus();
            }}
            // Below md the 24px pill gets a 44px touch target around it.
            className="relative inline-flex h-6 cursor-pointer items-center gap-0.5 rounded-full border border-line bg-surface pr-1 pl-2 text-caption whitespace-nowrap text-ink-muted hover:bg-surface-muted hover:text-ink max-md:before:absolute max-md:before:-inset-2.5 [&_svg]:size-4 [&_svg]:stroke-[1.5]"
          >
            {labels.childCount(childCount)}
            {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// 14/20 is the design system's size for the head line of a chart card (no text token); long names wrap.
const PERSON = 'text-[14px] leading-5';
