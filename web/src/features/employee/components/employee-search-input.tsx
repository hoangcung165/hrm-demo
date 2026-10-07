// The search box of the employee list: name or code, accents ignored by the API; reaches the URL 300 ms after typing.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import type { EmployeeFilters } from '../use-employee-filters';

export type EmployeeSearchInputProps = {
  filters: EmployeeFilters;
  /** 390: the shorter placeholder. */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
};

export function EmployeeSearchInput({ filters, compact = false, disabled, className }: EmployeeSearchInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      type="search"
      aria-label={t('employees.filter.search')}
      placeholder={t(compact ? 'employees.filter.searchShort' : 'employees.filter.search')}
      value={filters.search}
      maxLength={SEARCH_MAX_LENGTH}
      disabled={disabled}
      onChange={(event) => filters.setSearch(event.target.value)}
      leading={<Search aria-hidden="true" />}
      wrapperClassName={className}
      className="[&::-webkit-search-cancel-button]:hidden"
      trailing={
        filters.search ? (
          <button
            type="button"
            aria-label={t('employees.filter.clearSearch')}
            onClick={() => filters.setSearch('')}
            className="-mr-3 grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-surface-muted md:-mr-2 md:size-8 [&_svg]:size-4 [&_svg]:stroke-[1.5]"
          >
            <X aria-hidden="true" />
          </button>
        ) : null
      }
    />
  );
}
