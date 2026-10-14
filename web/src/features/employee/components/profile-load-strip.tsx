// The card at the top of the Dự án tab: the Tải phân bổ of the next 12 weeks, one heat cell per week (the same value as
// the heatmap row), the overload alert with the projects that add up, and the link to the heatmap.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { HeatCell, type HeatThresholds } from '@/components/ui/heat-cell';
import { periodNames } from '@/features/resource/period-label';
import { formatDate, formatDayMonth, formatPercent } from '@/lib/format';
import type { LoadStrip } from '../profile-projects-api';

export type ProfileLoadStripProps = {
  strip: LoadStrip;
  fullName: string;
  /** The code of the Employee, for the heatmap search. */
  code: string;
  thresholds: HeatThresholds;
  /** Whoever may read the resources gets the link. */
  canOpenHeatmap: boolean;
};

export function ProfileLoadStrip({ strip, fullName, code, thresholds, canOpenHeatmap }: ProfileLoadStripProps) {
  const { t } = useTranslation();
  const over = strip.firstOverload;
  return (
    <Card title={t('employees.profile.projects.stripTitle')} description={t('employees.profile.projects.stripText')}>
      <div className="flex flex-col gap-4">
        <ul aria-label={t('employees.profile.projects.stripLabel')} className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 lg:grid-cols-12">
          {strip.cells.map((cell) => (
            <li key={cell.from} className="flex flex-col items-start gap-1">
              <span className="text-caption text-ink-muted tabular-nums">{formatDayMonth(cell.from)}</span>
              <HeatCell
                percent={cell.peak}
                size="sm"
                thresholds={thresholds}
                label={t(cell.peak > 100 ? 'resources.heatmap.cellOver' : 'resources.heatmap.cell', { percent: formatPercent(cell.peak), name: fullName, period: periodNames(cell, 'WEEK', t).period })}
              />
            </li>
          ))}
        </ul>
        {over ? (
          <Alert variant="danger" title={t('employees.profile.projects.overTitle', { percent: formatPercent(over.totalPercent), from: formatDayMonth(over.from), to: formatDate(over.to) })}>
            {over.parts.map((part) => `${part.projectCode ?? part.projectName ?? ''} ${formatPercent(part.percent)}`).join(' + ')}
          </Alert>
        ) : null}
        {canOpenHeatmap ? (
          <Link to={`/resources?${new URLSearchParams({ tab: 'heatmap', q: code })}`} className="self-start rounded-sm text-body-small font-medium">
            {t('employees.profile.projects.openHeatmap')}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
