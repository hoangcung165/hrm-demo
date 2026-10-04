// Org structure (HRM-03): the unit tree and, from FE-4, the org chart. Needs ORG_VIEW; the view lives in `?view=`.
import { Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { Tabs } from '@/components/ui/tabs';
import { useCurrentAccount } from '@/features/auth/account-context';
import { OrgPageHeader } from './org-page-header';
import { OrgTreeSection } from './org-tree-section';

type OrgView = 'tree' | 'chart';

export function OrgPage() {
  const { t } = useTranslation();
  const canView = useCurrentAccount().permissions.includes('ORG_VIEW');
  const [params, setParams] = useSearchParams();
  const view: OrgView = params.get('view') === 'chart' ? 'chart' : 'tree';
  const setView = (next: OrgView) => {
    const search = new URLSearchParams(params);
    if (next === 'chart') search.set('view', 'chart');
    else search.delete('view');
    setParams(search);
  };
  return (
    <div className="flex flex-col gap-6">
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
        >
          {view === 'tree' ? (
            <OrgTreeSection />
          ) : (
            <Card bare>
              <StateBlock variant="plain" icon={<Network />} title={t('org.chartSoon.title')} description={t('org.chartSoon.text')} />
            </Card>
          )}
        </Tabs>
      ) : (
        <Card bare>
          <StateBlock variant="denied" title={t('org.denied.title')} description={t('org.denied.text')} />
        </Card>
      )}
    </div>
  );
}
