// Filter bar of the project list. Desktop: search, status, owning unit, "Chỉ dự án có người quá tải", and "Xóa bộ lọc"
// while anything differs from the defaults. Below 768px: the search and "Lọc" (with how many filters are on).
import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectFilters } from '../use-project-filters';
import { ProjectFilterDialog } from './project-filter-dialog';
import { ProjectOverloadFilter } from './project-overload-filter';
import { ProjectSearchInput } from './project-search-input';
import { ProjectStatusFilter } from './project-status-filter';
import { ProjectUnitFilter } from './project-unit-filter';

export type ProjectFilterBarProps = {
  filters: ProjectFilters;
  compact: boolean;
  /** How many projects match now, for the dialog's button; `undefined` while loading. */
  total: number | undefined;
  disabled?: boolean;
};

export function ProjectFilterBar({ filters, compact, total, disabled = false }: ProjectFilterBarProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  if (compact) {
    return (
      <div role="search" aria-label={t('projects.filter.label')} className="flex gap-2">
        <ProjectSearchInput filters={filters} compact disabled={disabled} className="h-11 min-w-0 flex-1" />
        <Button variant="secondary" className="h-11 shrink-0" onClick={() => setDialogOpen(true)}>
          <ListFilter aria-hidden="true" />
          {t('projects.filter.open')}
          {filters.activeCount > 0 ? (
            <Badge variant="info" className="h-5">
              <span aria-hidden="true">{filters.activeCount}</span>
              <span className="sr-only">{t('projects.filter.activeCount', { count: filters.activeCount })}</span>
            </Badge>
          ) : null}
        </Button>
        <ProjectFilterDialog open={dialogOpen} onOpenChange={setDialogOpen} filters={filters} total={total} />
      </div>
    );
  }
  return (
    <div role="search" aria-label={t('projects.filter.label')} className="flex flex-wrap items-center gap-3">
      <ProjectSearchInput filters={filters} disabled={disabled} className="w-80" />
      <ProjectStatusFilter filters={filters} disabled={disabled} className="w-48 min-[1440px]:w-50" />
      <ProjectUnitFilter filters={filters} disabled={disabled} className="w-52 min-[1440px]:w-60" />
      {filters.filtered ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={filters.clear}>
          {t('projects.filter.clear')}
        </Button>
      ) : null}
      <span className="flex-1" />
      <ProjectOverloadFilter filters={filters} disabled={disabled} />
    </div>
  );
}
