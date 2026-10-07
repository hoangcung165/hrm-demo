// Filter bar of the employee list. Desktop: search, unit, position, status, and "Xóa bộ lọc" while anything differs
// from the defaults. Below 768px: the search and "Lọc" (with how many filters are on), which opens the filter
// dialog, and a caption with the order and the status.
import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EmployeeFilters } from '../use-employee-filters';
import { EmployeeFilterDialog } from './employee-filter-dialog';
import { EmployeePositionFilter } from './employee-position-filter';
import { EmployeeSearchInput } from './employee-search-input';
import { EmployeeStatusFilter } from './employee-status-filter';
import { EmployeeUnitFilter } from './employee-unit-filter';

export type EmployeeFilterBarProps = {
  filters: EmployeeFilters;
  /** The unit filter needs ORG_VIEW, which reads the org tree. */
  unitFilter: boolean;
  compact: boolean;
  /** How many Employees match now, for the dialog's button; `undefined` while loading. */
  total: number | undefined;
  /** While the list loads for the first time. */
  disabled?: boolean;
};

// The artboard widths from 1440px; a little narrower below, so the four controls share one line at 1280.
export function EmployeeFilterBar({ filters, unitFilter, compact, total, disabled = false }: EmployeeFilterBarProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div role="search" aria-label={t('employees.filter.label')} className="flex gap-2">
          <EmployeeSearchInput filters={filters} compact disabled={disabled} className="h-11 min-w-0 flex-1" />
          <Button variant="secondary" className="h-11 shrink-0" onClick={() => setDialogOpen(true)}>
            <ListFilter aria-hidden="true" />
            {t('employees.filter.open')}
            {filters.activeCount > 0 ? (
              <Badge variant="info" className="h-5">
                <span aria-hidden="true">{filters.activeCount}</span>
                <span className="sr-only">{t('employees.filter.activeCount', { count: filters.activeCount })}</span>
              </Badge>
            ) : null}
          </Button>
        </div>
        <span className="text-caption text-ink-muted">
          {t(`employees.filter.sortCaption.${filters.query.sort}`)} · {t(`employees.filter.statusOption.${filters.status}`)}
        </span>
        <EmployeeFilterDialog open={dialogOpen} onOpenChange={setDialogOpen} filters={filters} unitFilter={unitFilter} total={total} />
      </div>
    );
  }
  return (
    <div role="search" aria-label={t('employees.filter.label')} className="flex flex-wrap items-center gap-3">
      <EmployeeSearchInput filters={filters} disabled={disabled} className="w-64 min-[1440px]:w-80" />
      {unitFilter ? <EmployeeUnitFilter filters={filters} disabled={disabled} className="w-60 min-[1440px]:w-65" /> : null}
      <EmployeePositionFilter filters={filters} disabled={disabled} className="w-48 min-[1440px]:w-50" />
      <EmployeeStatusFilter filters={filters} disabled={disabled} className="w-52 min-[1440px]:w-55" />
      {filters.filtered ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={filters.clear}>
          {t('employees.filter.clear')}
        </Button>
      ) : null}
    </div>
  );
}
