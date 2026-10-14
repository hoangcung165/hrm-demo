// Nguồn lực (HRM-17): the page of the resource views, behind RESOURCE_VIEW. The tabs are Tổng quan (the landing tab), Heatmap,
// Bench and Sắp hết dự án. The tab and the department are in the URL (`tab`, `unit`);
// each tab keeps the rest of its own filters there while it is open.
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useResourceCounts } from '@/features/resource/list-api';
import { useMediaQuery } from '@/lib/use-media-query';
import { BenchTab } from './bench-tab';
import { EndingTab } from './ending-tab';
import { HeatmapTab } from './heatmap-tab';
import { OverviewTab } from './overview-tab';
import { ResourcesDenied } from './resources-denied';

type ResourceTab = 'overview' | 'heatmap' | 'bench' | 'ending';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ResourcesPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const canView = permissions.includes('RESOURCE_VIEW');
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const active: ResourceTab = tabParam === 'heatmap' || tabParam === 'bench' || tabParam === 'ending' ? tabParam : 'overview';
  const unit = UUID.test(params.get('unit') ?? '') ? params.get('unit')! : '';
  const counts = useResourceCounts(unit, canView);

  // A tab starts with its own defaults; only the department goes with the person from tab to tab.
  const open = (tab: ResourceTab) => {
    const next = new URLSearchParams();
    if (unit) next.set('unit', unit);
    if (tab !== 'overview') next.set('tab', tab);
    setParams(next);
  };
  const tabs: Array<TabItem<ResourceTab>> = [
    { id: 'overview', label: t('resources.tab.overview') },
    { id: 'heatmap', label: t('resources.tab.heatmap') },
    { id: 'bench', label: t('resources.tab.bench'), count: counts.bench },
    { id: 'ending', label: t('resources.tab.ending'), count: counts.ending },
  ];
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h1 className="text-title">{t('resources.title')}</h1>
      {canView ? (
        <Tabs label={t('resources.title')} tabs={tabs} active={active} onChange={open} scrollable>
          <div className="pt-4">
            {active === 'overview' ? <OverviewTab /> : active === 'bench' ? <BenchTab compact={compact} /> : active === 'ending' ? <EndingTab compact={compact} thresholds={counts.thresholds} /> : <HeatmapTab compact={compact} />}
          </div>
        </Tabs>
      ) : (
        <ResourcesDenied />
      )}
    </div>
  );
}
