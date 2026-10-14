// Nguồn lực (HRM-17): the page of the resource views, behind RESOURCE_VIEW. The tabs are Tổng quan, Heatmap, Bench and
// Sắp hết dự án; a tab that is not built yet is not shown. On a phone only the heatmap is offered, view-only.
import { useTranslation } from 'react-i18next';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useHeatmapFilters } from '@/features/resource/use-heatmap-filters';
import { useMediaQuery } from '@/lib/use-media-query';
import { HeatmapTab } from './heatmap-tab';
import { ResourcesDenied } from './resources-denied';

type ResourceTab = 'heatmap';

export function ResourcesPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const canView = permissions.includes('RESOURCE_VIEW');
  const filters = useHeatmapFilters(compact);
  const tabs: Array<TabItem<ResourceTab>> = [{ id: 'heatmap', label: t('resources.tab.heatmap') }];
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h1 className="text-title">{t('resources.title')}</h1>
      {canView ? (
        <Tabs label={t('resources.title')} tabs={tabs} active="heatmap" onChange={() => {}} scrollable>
          <div className="pt-4">
            <HeatmapTab filters={filters} compact={compact} />
          </div>
        </Tabs>
      ) : (
        <ResourcesDenied />
      )}
    </div>
  );
}
