// The members of a project (`#15 Chi tiết dự án`): the overload alerts, the tabs "Thành viên" and "Phân bổ đã kết
// thúc" (in `?tab=`), the allocation table with its loading, empty and error states, and the heat legend.
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { HeatLegend } from '@/components/ui/heat-legend';
import { StateBlock } from '@/components/ui/state-block';
import { Tabs } from '@/components/ui/tabs';
import { useAllocations, type Project } from '@/features/project/api';
import { useAllocationActions } from '@/features/project/allocation-actions-context';
import { AllocationTable } from '@/features/project/components/allocation-table';
import { ProjectOverloadAlerts } from '@/features/project/components/project-overload-alerts';
import { useMediaQuery } from '@/lib/use-media-query';

type MembersTab = 'current' | 'ended';

export type ProjectMembersSectionProps = { project: Project };

export function ProjectMembersSection({ project }: ProjectMembersSectionProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const [params, setParams] = useSearchParams();
  const tab: MembersTab = params.get('tab') === 'ended' ? 'ended' : 'current';
  const setTab = (next: MembersTab) => {
    const search = new URLSearchParams(params);
    if (next === 'current') search.delete('tab');
    else search.set('tab', next);
    setParams(search, { replace: true });
  };
  const actions = useAllocationActions();
  const current = useAllocations(project.id, false);
  const ended = useAllocations(project.id, true, tab === 'ended');
  const shown = tab === 'ended' ? ended : current;
  const counts = current.data ?? ended.data;
  const rows = shown.data?.items ?? [];

  const body = shown.isError ? (
    <Card bare>
      <ErrorState title={t('projects.allocation.loadError')} onRetry={() => void shown.refetch()} />
    </Card>
  ) : shown.data && rows.length === 0 ? (
    <Card bare>
      <StateBlock
        variant={tab === 'current' ? 'empty' : 'plain'}
        icon={<Users />}
        title={t(tab === 'current' ? 'projects.allocation.emptyTitle' : 'projects.allocation.noneEndedTitle')}
        description={t(tab === 'current' ? 'projects.allocation.emptyText' : 'projects.allocation.noneEndedText')}
      />
    </Card>
  ) : (
    <div className="flex flex-col gap-4">
      <AllocationTable rows={rows} caption={t('projects.allocation.caption', { name: project.name })} loading={!shown.data} busy={shown.isPlaceholderData} compact={compact} withActions={Boolean(actions) && !compact && tab === 'current'} />
      <HeatLegend
        label={t('projects.load.legend')}
        items={[
          { percent: 40, label: t('projects.load.under') },
          { percent: 100, label: t('projects.load.full') },
          { percent: 120, label: t('projects.load.over') },
        ]}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {current.data ? <ProjectOverloadAlerts allocations={current.data.items} /> : null}
      <Tabs
        label={t('projects.allocation.tabs')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'current', label: t('projects.allocation.tab.current'), count: counts?.currentCount },
          { id: 'ended', label: t('projects.allocation.tab.ended'), count: counts?.endedCount },
        ]}
      >
        {body}
      </Tabs>
    </div>
  );
}
