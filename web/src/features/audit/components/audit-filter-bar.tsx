// Filter bar of the Audit log. Desktop: search, object, person, period, and "Xóa bộ lọc" while anything is set.
// Below 768px: the search and "Lọc" (with how many filters are on), which opens the filter Dialog.
import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditFilters } from '../use-audit-filters';
import { AuditActorFilter } from './audit-actor-filter';
import { AuditFilterDialog } from './audit-filter-dialog';
import { AuditPeriodFilter } from './audit-period-filter';
import { AuditSearchInput } from './audit-search-input';
import { AuditTypeFilter } from './audit-type-filter';

export type AuditFilterBarProps = {
  filters: AuditFilters;
  compact: boolean;
  /** How many records match now, for the Dialog's button; `undefined` while loading. */
  total: number | undefined;
  disabled?: boolean;
};

export function AuditFilterBar({ filters, compact, total, disabled = false }: AuditFilterBarProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  if (compact) {
    return (
      <div role="search" aria-label={t('audit.filter.label')} className="flex gap-2">
        <AuditSearchInput filters={filters} compact disabled={disabled} className="h-11 min-w-0 flex-1" />
        <Button variant="secondary" className="h-11 shrink-0" onClick={() => setDialogOpen(true)}>
          <ListFilter aria-hidden="true" />
          {t('audit.filter.open')}
          {filters.activeCount > 0 ? (
            <Badge variant="info" className="h-5">
              <span aria-hidden="true">{filters.activeCount}</span>
              <span className="sr-only">{t('audit.filter.activeCount', { count: filters.activeCount })}</span>
            </Badge>
          ) : null}
        </Button>
        <AuditFilterDialog open={dialogOpen} onOpenChange={setDialogOpen} filters={filters} total={total} />
      </div>
    );
  }
  return (
    <div role="search" aria-label={t('audit.filter.label')} className="flex flex-wrap items-center gap-3">
      <AuditSearchInput filters={filters} disabled={disabled} className="w-72 min-[1440px]:w-80" />
      <AuditTypeFilter filters={filters} disabled={disabled} className="w-48 min-[1440px]:w-52" />
      <AuditActorFilter filters={filters} disabled={disabled} className="w-48 min-[1440px]:w-52" />
      <AuditPeriodFilter filters={filters} labelHidden className="w-60" />
      {filters.filtered ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={filters.clear}>
          {t('audit.filter.clear')}
        </Button>
      ) : null}
    </div>
  );
}
