// "Theo tuần / Theo tháng": the two views of the heatmap.
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { HeatmapFilters } from '../use-heatmap-filters';

export type HeatmapViewSwitchProps = { filters: HeatmapFilters; disabled?: boolean; className?: string };

export function HeatmapViewSwitch({ filters, disabled, className }: HeatmapViewSwitchProps) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('resources.heatmap.view')} className={cn('inline-flex rounded-sm border border-line bg-surface p-0.5', className)}>
      {(['WEEK', 'MONTH'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={filters.granularity === value}
          disabled={disabled}
          onClick={() => filters.setView(value)}
          className={cn(
            'h-9 min-w-24 cursor-pointer rounded-sm px-3 text-body hover:bg-surface-muted md:h-8',
            filters.granularity === value && 'bg-brand-blue-soft font-medium text-brand-blue hover:bg-brand-blue-soft',
          )}
        >
          {t(`resources.heatmap.view${value === 'WEEK' ? 'Week' : 'Month'}`)}
        </button>
      ))}
    </div>
  );
}
