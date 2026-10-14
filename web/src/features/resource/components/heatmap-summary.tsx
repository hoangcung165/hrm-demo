// One line over the table: how many people, and how many are Quá tải this week and in the columns shown.
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import type { Heatmap } from '../api';

export type HeatmapSummaryProps = { data: Heatmap | undefined };

export function HeatmapSummary({ data }: HeatmapSummaryProps) {
  const { t } = useTranslation();
  if (!data) return <p className="text-body-small text-ink-muted">…</p>;
  const { people, overloadedNow, overloadedInWindow } = data.summary;
  return (
    <p className="text-body-small text-ink-muted">
      {t('resources.heatmap.summary', { people: formatNumber(people), count: people })}{' '}
      <span className={overloadedNow > 0 ? 'text-danger' : undefined}>{t('resources.heatmap.overloadedNow', { count: overloadedNow, number: formatNumber(overloadedNow) })}</span>
      {data.granularity === 'WEEK' || overloadedInWindow !== overloadedNow ? <> · {t('resources.heatmap.overloadedWindow', { count: overloadedInWindow, number: formatNumber(overloadedInWindow) })}</> : null}
    </p>
  );
}
