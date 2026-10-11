// The search box of the project list: code, name or client, accents ignored by the API; reaches the URL 300 ms after typing.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import type { ProjectFilters } from '../use-project-filters';

export type ProjectSearchInputProps = {
  filters: ProjectFilters;
  /** 390: the shorter placeholder. */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ProjectSearchInput({ filters, compact = false, disabled, className }: ProjectSearchInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      type="search"
      aria-label={t('projects.filter.search')}
      placeholder={t(compact ? 'projects.filter.searchShort' : 'projects.filter.search')}
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
            aria-label={t('projects.filter.clearSearch')}
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
