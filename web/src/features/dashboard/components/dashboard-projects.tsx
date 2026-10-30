// "Dự án đang chạy": the running projects with the people allocated this week and who is overloaded, as a rich Bar list.
// A row opens the project for an Account that may see projects; the head opens Nguồn lực.
import { FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarList, type BarListRow } from '@/components/ui/bar-list';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useOverview } from '@/features/resource/overview-api';
import { formatNumber } from '@/lib/format';

/** A Bar list holds at most 8 rows; the rest is what the link to Nguồn lực is for. */
const MAX_ROWS = 8;

export function DashboardProjects() {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const overview = useOverview({ week: '', orgUnitId: '' });
  const data = overview.data;
  const canOpen = permissions.includes('PROJECT_VIEW');
  const rows: BarListRow[] = [...(data?.projects ?? [])]
    .sort((a, b) => b.headcount - a.headcount)
    .slice(0, MAX_ROWS)
    .map((project) => ({
      key: project.projectId,
      label: project.name,
      value: project.headcount,
      to: canOpen ? `/projects/${project.projectId}` : undefined,
      caption: <span className="tabular-nums">{project.code}</span>,
      alert: project.overloaded > 0 ? t('dashboard.resources.projects.overloaded', { count: project.overloaded, number: formatNumber(project.overloaded) }) : undefined,
    }));
  return (
    <DashboardWidget
      title={t('dashboard.resources.projects.title')}
      description={t('dashboard.resources.projects.description')}
      count={data?.tiles.projectsRunning}
      link={{ label: t('dashboard.resources.projects.link'), to: '/resources' }}
      loading={overview.isPending}
      error={overview.isError && !data ? { title: t('dashboard.resources.projects.loadError'), onRetry: () => void overview.refetch() } : undefined}
      empty={data && rows.length === 0 ? { icon: <FolderKanban />, title: t('dashboard.resources.projects.empty.title'), text: t('dashboard.resources.projects.empty.text') } : undefined}
    >
      <BarList
        label={t('dashboard.resources.projects.chart')}
        variant="rich"
        rows={rows}
        format={(value) => t('dashboard.resources.projects.headcount', { count: value, number: formatNumber(value) })}
      />
    </DashboardWidget>
  );
}
