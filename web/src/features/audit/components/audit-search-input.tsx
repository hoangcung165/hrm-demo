// The search box of the Audit log: part of the summary or of the person's name, case ignored by the API; reaches the
// URL 300 ms after typing.
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/use-url-list-query';
import type { AuditFilters } from '../use-audit-filters';

export type AuditSearchInputProps = { filters: AuditFilters; compact?: boolean; disabled?: boolean; className?: string };

export function AuditSearchInput({ filters, compact = false, disabled, className }: AuditSearchInputProps) {
  const { t } = useTranslation();
  return (
    <Input
      type="search"
      aria-label={t('audit.filter.search')}
      placeholder={t(compact ? 'audit.filter.searchShort' : 'audit.filter.search')}
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
            aria-label={t('audit.filter.clearSearch')}
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
