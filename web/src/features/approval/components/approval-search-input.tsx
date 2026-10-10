// The search box of the inbox: the sender's name or code, accents ignored by the API; reaches the URL 300 ms after
// typing.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import type { ApprovalFilters } from '../use-approval-filters';

export type ApprovalSearchInputProps = {
  filters: ApprovalFilters;
  /** 390: the shorter placeholder. */
  compact?: boolean;
  className?: string;
};

export function ApprovalSearchInput({ filters, compact = false, className }: ApprovalSearchInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      type="search"
      aria-label={t('approvals.filter.search')}
      placeholder={t(compact ? 'approvals.filter.searchShort' : 'approvals.filter.search')}
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
            aria-label={t('approvals.filter.clearSearch')}
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
