// Filter bar of a catalog list: search, the year of the holidays, status, and "Xóa bộ lọc" while a filter is set.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import { CATALOG_STATUSES, type CatalogKey, type CatalogStatus } from '../api';
import type { useCatalogFilters } from '../use-catalog-filters';

export type CatalogFilterBarProps = {
  catalog: CatalogKey;
  filters: ReturnType<typeof useCatalogFilters>;
  /** Holidays: the years that have one; the current year is always offered. */
  years?: number[];
  /** While the list loads for the first time. */
  disabled?: boolean;
};

// The Select has no empty value: this one stands for "no filter".
const ALL = 'ALL';
// 44px controls below md.
const SELECT = 'max-md:h-11 max-md:min-w-0 max-md:flex-1 md:w-50';

export function CatalogFilterBar({ catalog, filters, years = [], disabled = false }: CatalogFilterBarProps) {
  const { t } = useTranslation();
  const { query } = filters;
  const holidays = catalog === 'holidays';
  const yearOptions = [...new Set([...years, filters.currentYear, query.year ?? filters.currentYear])].sort((a, b) => a - b);
  return (
    <div role="search" aria-label={t('catalogs.filter.label')} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Input
        type="search"
        aria-label={t(holidays ? 'catalogs.filter.searchName' : 'catalogs.filter.search')}
        placeholder={t(holidays ? 'catalogs.filter.searchName' : 'catalogs.filter.search')}
        value={filters.search}
        maxLength={SEARCH_MAX_LENGTH}
        disabled={disabled}
        onChange={(event) => filters.setSearch(event.target.value)}
        leading={<Search aria-hidden="true" />}
        wrapperClassName="h-11 basis-full md:h-10 md:w-80 md:basis-auto"
        className="[&::-webkit-search-cancel-button]:hidden"
        trailing={
          filters.search ? (
            <button
              type="button"
              aria-label={t('catalogs.filter.clearSearch')}
              onClick={() => filters.setSearch('')}
              className="-mr-3 grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-surface-muted md:-mr-2 md:size-8 [&_svg]:size-4 [&_svg]:stroke-[1.5]"
            >
              <X aria-hidden="true" />
            </button>
          ) : null
        }
      />
      {holidays ? (
        <Select
          aria-label={t('catalogs.filter.year')}
          value={String(query.year ?? filters.currentYear)}
          onChange={(value) => filters.setYear(Number(value))}
          options={yearOptions.map((year) => ({ value: String(year), label: t('catalogs.filter.yearOption', { year }) }))}
          placeholder={t('catalogs.filter.year')}
          disabled={disabled}
          className="max-md:h-11 max-md:min-w-0 max-md:flex-1 md:w-35"
        />
      ) : null}
      <Select
        aria-label={t('catalogs.filter.status')}
        value={query.status || ALL}
        onChange={(value) => filters.setStatus(value === ALL ? '' : (value as CatalogStatus))}
        options={[{ value: ALL, label: t('catalogs.filter.allStatuses') }, ...CATALOG_STATUSES.map((status) => ({ value: status, label: t(`catalogs.status.${status}`) }))]}
        placeholder={t('catalogs.filter.allStatuses')}
        disabled={disabled}
        className={SELECT}
      />
      {filters.filtered ? (
        <Button variant="ghost" size="sm" className="h-11 shrink-0 max-md:basis-full md:h-8" onClick={filters.clear}>
          {t('catalogs.filter.clear')}
        </Button>
      ) : null}
    </div>
  );
}
