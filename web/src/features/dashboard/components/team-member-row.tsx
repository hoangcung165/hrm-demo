import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { HeatCell, heatLevel, type HeatThresholds } from '@/components/ui/heat-cell';
import { Person } from '@/components/ui/person';
import { formatDateRange, formatPercent } from '@/lib/format';
import type { TeamMember } from '../team-api';

/** How many leave periods a row names before it counts the rest. */
const LEAVE_SHOWN = 2;

export type TeamMemberRowProps = {
  member: TeamMember;
  thresholds: HeatThresholds;
  /** Needs RESOURCE_VIEW: without it the load is shown but leads nowhere. */
  heatmapTo?: string;
};

/** One person of "Nhóm của tôi": the name opens the profile, the load cell the person's row on the Heatmap. */
export function TeamMemberRow({ member, thresholds, heatmapTo }: TeamMemberRowProps) {
  const { t } = useTranslation();
  const { employee, load, upcomingLeave } = member;
  const percent = formatPercent(load);
  const over = heatLevel(load, thresholds) === 'over';
  const cell = <HeatCell percent={load} thresholds={thresholds} label={t(over ? 'projects.load.labelOver' : 'projects.load.label', { percent })} />;
  const shown = upcomingLeave.slice(0, LEAVE_SHOWN);
  const more = upcomingLeave.length - shown.length;
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 md:flex-row md:items-center md:gap-4">
      <Link to={`/employees/${employee.id}`} className="min-w-0 rounded-sm md:w-64 md:shrink-0">
        <Person name={employee.fullName} caption={employee.code} />
      </Link>
      <div className="flex min-w-0 flex-1 items-start gap-2 text-body-small text-ink-muted">
        <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 stroke-[1.5]" />
        {shown.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {shown.map((leave) => (
              <li key={`${leave.leaveType.id}-${leave.startDate}`}>
                {leave.leaveType.name} · {formatDateRange(leave.startDate, leave.endDate)}
              </li>
            ))}
            {more > 0 ? <li>{t('dashboard.team.moreLeave', { count: more })}</li> : null}
          </ul>
        ) : (
          <span>{t('dashboard.team.noLeave')}</span>
        )}
      </div>
      {heatmapTo ? (
        <Link to={heatmapTo} aria-label={t('dashboard.team.heatmapAria', { name: employee.fullName, percent })} className="w-fit rounded-sm">
          {cell}
        </Link>
      ) : (
        cell
      )}
    </li>
  );
}
