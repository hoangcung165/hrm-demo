// "Lọc heatmap" at 390: unit, load level and sort in a Dialog. Each choice applies at once; "Xem {n} người" closes the
// Dialog on the table, "Xóa bộ lọc" goes back to the defaults.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { formatNumber } from '@/lib/format';
import type { HeatmapFilters } from '../use-heatmap-filters';
import { HeatmapLevelFilter } from './heatmap-level-filter';
import { HeatmapSortFilter } from './heatmap-sort-filter';
import { HeatmapUnitFilter } from './heatmap-unit-filter';

export type HeatmapFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: HeatmapFilters;
  /** How many people match now; `undefined` while the heatmap loads. */
  total: number | undefined;
};

export function HeatmapFilterDialog({ open, onOpenChange, filters, total }: HeatmapFilterDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('resources.filter.dialogTitle')}
      className="max-md:top-auto max-md:bottom-4 max-md:translate-y-0"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={filters.clear}>
            {t('resources.filter.clear')}
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            {total === undefined ? t('resources.filter.showPending') : t('resources.filter.show', { count: total, total: formatNumber(total) })}
          </Button>
        </>
      }
    >
      <Field label={t('resources.filter.unit')}>{(control) => <HeatmapUnitFilter filters={filters} id={control.id} className="h-11" />}</Field>
      <Field label={t('resources.filter.level')}>{(control) => <HeatmapLevelFilter filters={filters} id={control.id} className="h-11" />}</Field>
      <Field label={t('resources.filter.sort')}>{(control) => <HeatmapSortFilter filters={filters} id={control.id} className="h-11" />}</Field>
    </Dialog>
  );
}
