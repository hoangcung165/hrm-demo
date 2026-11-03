// The unit (required, within the data scope) and the week: back, the dates, forward up to this week, "Tuần này".
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TreeSelect } from '@/components/ui/tree-select';
import { useScopedUnits } from '@/features/shift/use-scoped-units';
import { formatDateRange } from '@/lib/format';
import type { ManualFilters } from '../use-manual-filters';

export function ManualToolbar({ filters }: { filters: ManualFilters }) {
  const { t } = useTranslation();
  const { nodes } = useScopedUnits();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <TreeSelect
        label={t('attendanceManual.unit')}
        nodes={nodes}
        value={filters.orgUnitId}
        onChange={filters.setUnit}
        placeholder={t('attendanceManual.pickUnit')}
        searchLabel={t('attendanceDaily.filter.findUnit')}
        noMatchText={t('attendanceDaily.filter.noUnit')}
        className="w-80"
      />
      <div role="group" aria-label={t('attendanceManual.week.label')} className="flex items-center gap-2">
        <Button variant="secondary" size="icon" aria-label={t('attendanceManual.week.back')} onClick={filters.back}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span aria-live="polite" className="w-44 text-center text-body-strong tabular-nums">
          {formatDateRange(filters.days[0]!, filters.days[6]!)}
        </span>
        <Button variant="secondary" size="icon" aria-label={t('attendanceManual.week.forward')} onClick={filters.forward} disabled={!filters.canForward}>
          <ChevronRight aria-hidden="true" />
        </Button>
        {!filters.isThisWeek ? (
          <Button variant="ghost" size="sm" onClick={filters.toThisWeek}>
            {t('attendanceManual.week.thisWeek')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
