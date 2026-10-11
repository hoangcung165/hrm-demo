// The project's facts under its title (`#15 Chi tiết dự án`): PM, Phòng ban phụ trách, dates with how many months,
// Ngân sách nhân sự, and the head counts.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import { formatDate, formatMoney, formatNumber, monthsInRange } from '@/lib/format';
import type { Project } from '../api';

export type ProjectSummaryCardProps = { project: Project };

function Fact({ label, value, caption }: { label: string; value: ReactNode; caption?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="m-0 flex flex-col gap-0.5 font-medium">
        {value}
        {caption ? <span className="text-caption font-normal text-ink-muted">{caption}</span> : null}
      </dd>
    </div>
  );
}

export function ProjectSummaryCard({ project }: ProjectSummaryCardProps) {
  const { t } = useTranslation();
  const months = monthsInRange(project.startDate, project.endDate);
  const { running, upcoming } = project.members;
  return (
    <section aria-label={t('projects.detail.summary')} className="rounded-md border border-line bg-surface p-4 md:p-6">
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1.3fr_1fr_0.9fr] lg:gap-6">
        <Fact label={t('projects.col.pm')} value={project.pm ? <Person name={project.pm.fullName} caption={project.pm.orgUnitName ?? undefined} /> : '—'} />
        <Fact label={t('projects.filter.unit')} value={project.orgUnit?.name ?? '—'} />
        <Fact
          label={t('projects.col.dates')}
          value={<span className="tabular-nums">{`${formatDate(project.startDate)} – ${formatDate(project.endDate)}`}</span>}
          caption={months > 0 ? t('projects.detail.months', { count: months, number: formatNumber(months) }) : undefined}
        />
        <Fact label={t('projects.detail.budget')} value={<span className="tabular-nums">{project.laborBudget === null ? t('projects.detail.noBudget') : formatMoney(project.laborBudget)}</span>} />
        <Fact
          label={t('projects.col.members')}
          value={<span className="tabular-nums">{t('projects.detail.running', { count: running, number: formatNumber(running) })}</span>}
          caption={upcoming > 0 ? t('projects.detail.upcoming', { count: upcoming, number: formatNumber(upcoming) }) : undefined}
        />
      </dl>
    </section>
  );
}
