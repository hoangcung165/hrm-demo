// The search box of the contract list: Employee name or code (accents ignored by the API) or the contract number.
// Reaches the URL 300 ms after typing, through the filters hook.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import type { ContractListFilters } from '../use-contract-list-filters';

export type ContractListSearchProps = {
  filters: ContractListFilters;
  className?: string;
};

export function ContractListSearch({ filters, className }: ContractListSearchProps) {
  const { t } = useTranslation();
  return (
    <Input
      type="search"
      aria-label={t('contractList.filter.search')}
      placeholder={t('contractList.filter.searchPlaceholder')}
      value={filters.search}
      maxLength={SEARCH_MAX_LENGTH}
      onChange={(event) => filters.setSearch(event.target.value)}
      leading={<Search aria-hidden="true" />}
      wrapperClassName={className}
      className="[&::-webkit-search-cancel-button]:hidden"
      trailing={
        filters.search ? (
          <button
            type="button"
            aria-label={t('contractList.filter.clearSearch')}
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
