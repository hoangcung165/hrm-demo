// The org chart card: toolbar, the chart in its viewport, the usage hint, and the empty state. Read-only.
import { Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OrgChart, type OrgChartNode } from '@/components/ui/org-chart';
import { StateBlock } from '@/components/ui/state-block';
import { useOrgChartZoom } from '@/components/ui/use-org-chart-zoom';
import { formatNumber } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import { ROOT_ID, type OrgNode } from '../org-tree';
import { useOrgTreeView } from '../use-org-tree-view';
import { OrgChartToolbar } from './org-chart-toolbar';

export type OrgUnitChartProps = {
  /** The company node with every unit under it. */
  root: OrgNode;
  /** The unit carried over from the tree (`?unit=`); `null` when the company is selected. */
  selectedId: string | null;
  /** Address of a node in the tree tab. */
  hrefFor: (id: string) => string;
  /** Opens a node in the tree tab. */
  onOpen: (id: string) => void;
  /** Layout of the card when it shows units, e.g. to fill the page. */
  className?: string;
};

export function OrgUnitChart({ root, selectedId, hrefFor, onOpen, className }: OrgUnitChartProps) {
  const { t } = useTranslation();
  const view = useOrgTreeView(root, selectedId ?? ROOT_ID, { showInactive: false });
  const zoom = useOrgChartZoom();
  // Touch screens have no background drag or Ctrl + wheel: the hint names swipe and the zoom buttons instead.
  const touch = useMediaQuery('(pointer: coarse)');
  const empty = root.children.length === 0;
  const count = (key: 'org.employeeCount' | 'org.unitCount' | 'org.childUnitCount', value: number) => t(key, { count: value, formatted: formatNumber(value) });

  const toChartNode = (node: OrgNode): OrgChartNode => ({
    id: node.id,
    name: node.name,
    ariaLabel: [
      t('org.tree.rowLabel', {
        name: node.name,
        type: t(`org.type.${node.type}`),
        head: node.head?.fullName ?? t('org.tree.rowNoHead'),
        employees: count('org.employeeCount', node.headcountTotal),
      }),
      ...(node.active ? [] : [t('org.status.inactive')]),
    ].join(', '),
    typeLabel: t(`org.type.${node.type}`),
    code: node.code,
    head: node.head ? { name: node.head.fullName, avatarUrl: node.head.avatarUrl } : null,
    headcount: node.headcountTotal,
    active: node.active,
    children: node.children.map(toChartNode),
  });

  return (
    // With only the company there is nothing to pan: the card keeps its own height instead of the layout of `className`.
    <div className={cn('flex flex-col overflow-hidden rounded-md border border-line bg-surface', !empty && className)}>
      {empty ? null : <OrgChartToolbar view={view} zoom={zoom} />}
      <OrgChart
        label={t('org.chart.label')}
        // Without a search the filter always keeps the company node.
        root={toChartNode(view.visibleRoot ?? root)}
        expandedIds={view.expandedIds}
        selectedId={selectedId}
        showInactive={view.showInactive}
        zoom={zoom.zoom}
        onToggle={view.toggle}
        onOpen={onOpen}
        hrefFor={hrefFor}
        viewportRef={zoom.viewportRef}
        labels={{
          inactive: t('org.status.inactive'),
          vacant: t('org.chart.noHead'),
          headcount: (value) => count('org.employeeCount', value),
          childCount: (value) => count('org.unitCount', value),
          expand: (value, name) => t('org.chart.expandChildren', { children: count('org.childUnitCount', value), name }),
          collapse: (value, name) => t('org.chart.collapseChildren', { children: count('org.childUnitCount', value), name }),
        }}
        className={empty ? undefined : 'min-h-80 flex-1'}
      />
      {empty ? (
        <StateBlock variant="empty" icon={<Network />} title={t('org.tree.empty.title')} description={t('org.tree.empty.text', { company: root.name })} className="border-t border-line" />
      ) : (
        <p className="border-t border-line px-4 py-2 text-caption text-ink-muted">{t(touch ? 'org.chart.hintTouch' : 'org.chart.hint')}</p>
      )}
    </div>
  );
}
