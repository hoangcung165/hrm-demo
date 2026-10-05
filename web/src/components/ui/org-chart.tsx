// Library component "Org chart": the organisation as cards joined by connectors. The company sits on top, its units
// form one row, deeper levels hang in a stack under their parent. Read-only; it pans (drag, scroll) and zooms.
// Parts: `OrgChartNodeCard`, `OrgChartBranch`, `OrgChartSkeleton`, `OrgChartZoom` + `useOrgChartZoom`.
import { useLayoutEffect, useRef, useState, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { OrgChartBranch } from './org-chart-branch';
import { OrgChartNodeCard } from './org-chart-node';
import { revealShift } from './org-chart-scroll';
import { ORG_CHART_VIEWPORT } from './org-chart-skeleton';
import { useDragPan } from './use-drag-pan';
import { useTreeNavigation } from './use-tree-navigation';

export type OrgChartNode = {
  id: string;
  name: string;
  /** Accessible name of the card: "Phòng Kinh doanh, Phòng ban, Trưởng đơn vị: Đinh Công Sơn, 20 nhân viên". */
  ariaLabel: string;
  /** "Phòng ban"; "Công ty" on the root. */
  typeLabel: string;
  /** `null` on the root. */
  code: string | null;
  /** `null` when nobody is assigned. */
  head: { name: string; avatarUrl?: string | null } | null;
  headcount: number;
  active: boolean;
  children: OrgChartNode[];
};

export type OrgChartLabels = {
  /** Text of the inactive Badge: "Ngừng hoạt động". */
  inactive: string;
  /** Beside the vacant Avatar: "Chưa có trưởng đơn vị". */
  vacant: string;
  /** "20 nhân viên". */
  headcount: (count: number) => string;
  /** Text of the toggle: "2 đơn vị". */
  childCount: (count: number) => string;
  /** "Mở 2 đơn vị con của Phòng Kinh doanh". */
  expand: (count: number, name: string) => string;
  /** "Thu gọn 2 đơn vị con của Phòng Kinh doanh". */
  collapse: (count: number, name: string) => string;
};

export type OrgChartProps = {
  /** Accessible name of the chart, e.g. "Sơ đồ tổ chức". Loading is `OrgChartSkeleton`. */
  label: string;
  /** The company with every unit under it. */
  root: OrgChartNode;
  /** Units whose children show. The root is always open. */
  expandedIds: ReadonlySet<string>;
  selectedId: string | null;
  /** Off: inactive units are left out, except those that still have a unit to show under them. */
  showInactive: boolean;
  /** Percentage, 100 = natural size. */
  zoom: number;
  onToggle: (id: string) => void;
  /** A unit name was activated (click, or Enter on the card). */
  onOpen: (id: string) => void;
  /** Address behind a unit name, so the link also opens in a new tab. */
  hrefFor?: (id: string) => string;
  labels: OrgChartLabels;
  /** The scrolling viewport; `useOrgChartZoom` measures it for "Vừa màn hình". */
  viewportRef?: Ref<HTMLDivElement>;
  className?: string;
};

/** Leaves out inactive units, keeping those that still have a visible unit under them. */
function withoutInactive(node: OrgChartNode): OrgChartNode {
  const children = node.children.map(withoutInactive).filter((child) => child.active || child.children.length > 0);
  return { ...node, children };
}

type Size = { width: number; height: number };

export function OrgChart({ label, root, expandedIds, selectedId, showInactive, zoom, onToggle, onOpen, hrefFor, labels, viewportRef, className }: OrgChartProps) {
  const visible = showInactive ? root : withoutInactive(root);
  const rootId = root.id;
  const open = new Set([...expandedIds, rootId]);
  // The root has no toggle: it never collapses.
  const toggle = (id: string) => {
    if (id !== rootId) onToggle(id);
  };
  const { tabbableId, setFocusedId, onKeyDown } = useTreeNavigation({
    nodes: [visible],
    expandedIds: open,
    currentId: selectedId,
    onToggle: toggle,
    onChoose: onOpen,
    // Space on a card without a toggle (a leaf, the company) does nothing.
    onSpace: (node) => {
      if (node.children.length > 0) toggle(node.id);
    },
  });
  const pan = useDragPan('[data-tree-id]');

  // The scale transform does not change layout, so a sizer takes the scaled size: the viewport scrolls over exactly that.
  const chart = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  useLayoutEffect(() => {
    const element = chart.current;
    if (!element) return;
    const measure = () => {
      const next = { width: element.offsetWidth, height: element.offsetHeight };
      if (next.width > 0) setNatural((size) => (size?.width === next.width && size.height === next.height ? size : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootId]);
  const scale = zoom / 100;

  // First paint: a chart wider than the viewport starts centred on the company, or on the selected card when that is out of view.
  const measured = natural !== null;
  useLayoutEffect(() => {
    const view = chart.current?.parentElement?.parentElement;
    if (!measured || !view) return;
    view.scrollLeft = (view.scrollWidth - view.clientWidth) / 2;
    const card = view.querySelector('[aria-selected="true"]')?.getBoundingClientRect();
    if (!card) return;
    const frame = view.getBoundingClientRect();
    // Per axis: a card that is in view on one axis leaves that axis alone, so the company row stays in view when it can.
    view.scrollLeft += revealShift({ start: card.left, end: card.right }, { start: frame.left, end: frame.right });
    view.scrollTop += revealShift({ start: card.top, end: card.bottom }, { start: frame.top, end: frame.bottom });
    // Only when the chart first has a size; later the user owns the scroll position.
  }, [measured]);
  const context = { expandedIds: open, selectedId, tabbableId, labels, hrefFor, onToggle: toggle, onOpen, onFocus: setFocusedId };

  return (
    <div
      ref={viewportRef}
      {...pan.handlers}
      className={cn(ORG_CHART_VIEWPORT, 'overflow-auto', pan.dragging ? 'cursor-grabbing select-none' : 'cursor-grab', className)}
    >
      <div className="mx-auto w-max" style={natural ? { width: natural.width * scale, height: natural.height * scale } : undefined}>
        <div ref={chart} role="tree" aria-label={label} onKeyDown={onKeyDown} className="flex w-max origin-top-left cursor-default flex-col items-center" style={{ transform: `scale(${scale})` }}>
          <OrgChartNodeCard
            node={visible}
            variant="root"
            level={1}
            expanded
            selected={visible.id === selectedId}
            tabbable={visible.id === tabbableId}
            labels={labels}
            href={hrefFor?.(visible.id)}
            onToggle={toggle}
            onOpen={onOpen}
            onFocus={setFocusedId}
          />
          {visible.children.length > 0 ? <OrgChartBranch nodes={visible.children} level={2} context={context} /> : null}
        </div>
      </div>
    </div>
  );
}
