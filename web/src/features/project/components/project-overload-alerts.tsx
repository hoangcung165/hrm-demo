// One danger Alert per overloaded member (`#15 Chi tiết dự án`): who, how much, when, and which other projects
// overlap, from the running and upcoming allocations' overloaded periods.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { formatDate, formatDayMonth, formatPercent } from '@/lib/format';
import type { Allocation } from '../api';

export type ProjectOverloadAlertsProps = { allocations: Allocation[] };

export function ProjectOverloadAlerts({ allocations }: ProjectOverloadAlertsProps) {
  const { t } = useTranslation();
  const overloaded = allocations.filter((a) => a.overloadedPeriods.length > 0);
  if (overloaded.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {overloaded.map((a) => {
        const period = a.overloadedPeriods[0]!;
        const others = period.parts.filter((part) => !part.thisProject).map((part) => t('projects.detail.overlapPart', { name: part.projectName ?? part.projectCode ?? '', percent: formatPercent(part.percent) }));
        return (
          <Alert
            key={a.id}
            variant="danger"
            title={t('projects.detail.overloadTitle', {
              name: a.employee?.fullName ?? '',
              percent: formatPercent(period.totalPercent),
              from: formatDayMonth(period.from),
              to: formatDate(period.to),
            })}
          >
            {t('projects.detail.overloadText', { percent: formatPercent(a.percent), others: others.join(', ') })}
            {a.overloadedPeriods.length > 1 ? ` ${t('projects.detail.morePeriods', { count: a.overloadedPeriods.length - 1, until: formatDate(a.overloadedPeriods.at(-1)!.to) })}` : ''}
          </Alert>
        );
      })}
    </div>
  );
}
