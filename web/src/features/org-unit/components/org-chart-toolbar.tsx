// Toolbar of the org chart: the inactive toggle, expand/collapse all, and the zoom controls.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { OrgChartZoom } from '@/components/ui/org-chart-zoom';
import type { useOrgChartZoom } from '@/components/ui/use-org-chart-zoom';
import type { useOrgTreeView } from '../use-org-tree-view';

export type OrgChartToolbarProps = {
  view: ReturnType<typeof useOrgTreeView>;
  zoom: ReturnType<typeof useOrgChartZoom>;
};

// 44px touch targets below md.
const ACTION = 'h-11 shrink-0 md:h-8';

export function OrgChartToolbar({ view, zoom }: OrgChartToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
      <Checkbox checked={view.showInactive} onChange={(event) => view.setShowInactive(event.target.checked)} className="min-h-11 max-md:basis-full md:min-h-0">
        {t('org.tree.showInactive')}
      </Checkbox>
      <Button variant="ghost" size="sm" className={ACTION} onClick={view.expandAll}>
        {t('org.tree.expandAll')}
      </Button>
      <Button variant="ghost" size="sm" className={ACTION} onClick={view.collapseAll}>
        {t('org.tree.collapseAll')}
      </Button>
      <OrgChartZoom
        zoom={zoom.zoom}
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onFit={zoom.fit}
        canZoomIn={zoom.canZoomIn}
        canZoomOut={zoom.canZoomOut}
        labels={{ group: t('org.chart.zoom.label'), zoomOut: t('org.chart.zoom.out'), zoomIn: t('org.chart.zoom.in'), fit: t('org.chart.zoom.fit') }}
        className="md:ml-auto"
      />
    </div>
  );
}
