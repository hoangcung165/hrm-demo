// Filter "Mức tải": people whose highest load in the columns shown is on one level.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { HEATMAP_LEVELS, type HeatmapLevel } from '../api';
import type { HeatmapFilters } from '../use-heatmap-filters';

export type HeatmapLevelFilterProps = { filters: HeatmapFilters; id?: string; disabled?: boolean; className?: string };

export function HeatmapLevelFilter({ filters, id, disabled, className }: HeatmapLevelFilterProps) {
  const { t } = useTranslation();
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('resources.filter.level')}
      value={filters.query.level || 'ALL'}
      onChange={(value) => filters.setLevel(value === 'ALL' ? '' : (value as HeatmapLevel))}
      options={[{ value: 'ALL', label: t('resources.filter.allLevels') }, ...HEATMAP_LEVELS.map((value) => ({ value, label: t(`resources.filter.levelOption.${value}`) }))]}
      placeholder={t('resources.filter.allLevels')}
      disabled={disabled}
      className={className}
    />
  );
}
