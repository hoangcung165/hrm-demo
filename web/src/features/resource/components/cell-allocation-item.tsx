// One allocation in the cell detail: project, role, share, dates, and whether it starts or ends in the period.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { formatDateRange, formatPercent } from '@/lib/format';
import type { CellAllocation } from '../api';

export type CellAllocationItemProps = {
  allocation: CellAllocation;
  /** The period shown: an allocation that starts or ends inside it gets a badge. */
  from: string;
  to: string;
  /** Whether the project may be opened (`PROJECT_VIEW`). */
  linkToProject: boolean;
};

export function CellAllocationItem({ allocation, from, to, linkToProject }: CellAllocationItemProps) {
  const { t } = useTranslation();
  const project = `${allocation.projectCode} · ${allocation.projectName}`;
  const starts = allocation.startDate >= from && allocation.startDate <= to;
  const ends = allocation.endDate >= from && allocation.endDate <= to;
  return (
    <li className="flex flex-col gap-1 rounded-md border border-line px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        {linkToProject ? (
          <Link to={`/projects/${allocation.projectId}`} className="min-w-0 rounded-sm text-body-strong text-brand-blue hover:underline focus-visible:shadow-focus-ring">
            {project}
          </Link>
        ) : (
          <span className="min-w-0 text-body-strong">{project}</span>
        )}
        <span className="shrink-0 text-body-strong tabular-nums">{formatPercent(allocation.percent)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
        {allocation.projectRole ? <span>{allocation.projectRole.name}</span> : null}
        <span className="tabular-nums">{formatDateRange(allocation.startDate, allocation.endDate)}</span>
        {starts ? <Badge variant="info">{t('resources.cell.starts')}</Badge> : null}
        {ends ? <Badge variant="neutral">{t('resources.cell.ends')}</Badge> : null}
      </div>
    </li>
  );
}
