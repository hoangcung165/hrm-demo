// "Sơ đồ tổ chức" tab: the read-only org chart. A unit name opens that unit in the "Cây đơn vị" tab.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrgChartSkeleton } from '@/components/ui/org-chart-skeleton';
import { useOrgStructure } from '@/features/org-unit/api';
import { OrgUnitChart } from '@/features/org-unit/components/org-unit-chart';
import { buildTree, findNode, ROOT_ID } from '@/features/org-unit/org-tree';
import { useUnitSelection } from '@/features/org-unit/use-unit-selection';
import { OrgLoadError } from './org-load-error';

// The chart takes the height the page has left; the viewport scrolls inside it.
const FILL = 'min-h-0 flex-1';

export function OrgChartSection() {
  const { t } = useTranslation();
  const structure = useOrgStructure();
  const { unitParam, treeHref, openInTree } = useUnitSelection();
  const root = useMemo(() => (structure.data ? buildTree(structure.data) : null), [structure.data]);

  if (structure.isError) return <OrgLoadError error={structure.error} onRetry={() => void structure.refetch()} />;
  if (!root) {
    return <OrgChartSkeleton label={t('org.chart.loading')} className={`rounded-md border border-line ${FILL}`} />;
  }
  // An unknown or stale `?unit=`, or the company itself, selects no card.
  const selected = findNode(root, unitParam);
  return <OrgUnitChart root={root} selectedId={selected && selected.id !== ROOT_ID ? selected.id : null} hrefFor={treeHref} onOpen={openInTree} className={FILL} />;
}
