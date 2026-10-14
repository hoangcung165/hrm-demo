// The search box of the heatmap: name or code, accents ignored by the API; reaches the URL 300 ms after typing.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import type { HeatmapFilters } from '../use-heatmap-filters';

export type HeatmapSearchInputProps = { filters: HeatmapFilters; compact?: boolean; disabled?: boolean; className?: string };

export function HeatmapSearchInput({ filters, compact = false, disabled, className }: HeatmapSearchInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      type="search"
      aria-label={t('resources.filter.search')}
      placeholder={t(compact ? 'resources.filter.searchShort' : 'resources.filter.search')}
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
            aria-label={t('resources.filter.clearSearch')}
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
