// "Sắp xếp": highest load first (the default, so Quá tải is on top), lowest first, or by name.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ui/select';
import { HEATMAP_SORTS, type HeatmapSort } from '../api';
import type { HeatmapFilters } from '../use-heatmap-filters';

export type HeatmapSortFilterProps = { filters: HeatmapFilters; id?: string; disabled?: boolean; className?: string };

export function HeatmapSortFilter({ filters, id, disabled, className }: HeatmapSortFilterProps) {
  const { t } = useTranslation();
  return (
    <Select
      id={id}
      aria-label={id ? undefined : t('resources.filter.sort')}
      value={filters.query.sort}
      onChange={(value) => filters.setSort(value as HeatmapSort)}
      options={HEATMAP_SORTS.map((value) => ({ value, label: t(`resources.filter.sortOption.${value}`) }))}
      placeholder={t('resources.filter.sortOption.LOAD_DESC')}
      disabled={disabled}
      className={className}
    />
  );
}
