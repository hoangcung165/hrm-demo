// "Nhân sự theo dự án": the running projects with their head count, full-time equivalents and overloaded people.
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { formatNumber } from '@/lib/format';
import type { OverviewProject } from '../overview-api';

export function OverviewProjects({ projects }: { projects: OverviewProject[] }) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const canOpen = permissions.includes('PROJECT_VIEW');
  if (projects.length === 0) return <StateBlock variant="empty" title={t('resources.overview.projects.empty.title')} description={t('resources.overview.projects.empty.text')} />;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {projects.map((project) => {
        const name = (
          <>
            <span className="text-ink-muted tabular-nums">{project.code}</span> <span className="font-medium">{project.name}</span>
          </>
        );
        return (
          <li key={project.projectId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">
              {canOpen ? (
                <Link to={`/projects/${project.projectId}`} className="rounded-sm hover:text-brand-blue focus-visible:shadow-focus-ring">
                  {name}
                </Link>
              ) : (
                name
              )}
            </span>
            <span className="tabular-nums">{t('resources.overview.projects.headcount', { count: project.headcount, number: formatNumber(project.headcount) })}</span>
            <span className="w-24 text-ink-muted tabular-nums">{t('resources.overview.projects.fte', { value: formatNumber(project.fte) })}</span>
            {project.overloaded > 0 ? <Badge variant="danger">{t('resources.overview.projects.overloaded', { count: project.overloaded, number: formatNumber(project.overloaded) })}</Badge> : null}
            {project.upcoming > 0 ? <Badge variant="info">{t('resources.overview.projects.upcoming', { count: project.upcoming, number: formatNumber(project.upcoming) })}</Badge> : null}
          </li>
        );
      })}
    </ul>
  );
}
