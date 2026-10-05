// Org structure (HRM-03): the unit tree and the org chart. Needs ORG_VIEW; the view lives in `?view=`.
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { Tabs } from '@/components/ui/tabs';
import { useCurrentAccount } from '@/features/auth/account-context';
import { cn } from '@/lib/utils';
import { OrgUnitActionsProvider } from '@/features/org-unit/components/org-unit-actions-provider';
import { OrgChartSection } from './org-chart-section';
import { OrgPageHeader } from './org-page-header';
import { OrgTreeSection } from './org-tree-section';

type OrgView = 'tree' | 'chart';

export function OrgPage() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const canView = permissions.includes('ORG_VIEW');
  const [params, setParams] = useSearchParams();
  const view: OrgView = params.get('view') === 'chart' ? 'chart' : 'tree';
  const setView = (next: OrgView) => {
    const search = new URLSearchParams(params);
    if (next === 'chart') search.set('view', 'chart');
    else search.delete('view');
    setParams(search);
  };
  return (
    <OrgUnitActionsProvider enabled={canView && permissions.includes('ORG_EDIT')}>
      {/* The chart fills the height the page has left, so its viewport scrolls instead of the page. */}
      <div className={cn('flex flex-col gap-6', canView && view === 'chart' && 'h-full')}>
        <OrgPageHeader canView={canView} />
        {canView ? (
          <Tabs
            label={t('org.views.label')}
            tabs={[
              { id: 'tree', label: t('org.views.tree') },
              { id: 'chart', label: t('org.views.chart') },
            ]}
            active={view}
            onChange={setView}
            panelClassName={view === 'chart' ? 'flex min-h-0 flex-1 flex-col' : undefined}
          >
            {view === 'tree' ? <OrgTreeSection /> : <OrgChartSection />}
          </Tabs>
        ) : (
          <Card bare>
            <StateBlock variant="denied" title={t('org.denied.title')} description={t('org.denied.text')} />
          </Card>
        )}
      </div>
    </OrgUnitActionsProvider>
  );
}
