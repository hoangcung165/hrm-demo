// Filter bar of the inbox: the sender search and the request type, "Xóa bộ lọc" while either is set, and the order
// of the tab. Below 768px the two controls stack and the order is not shown.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { APPROVAL_REQUEST_TYPES, type ApprovalOnBehalf, type ApprovalRequestType } from '../api';
import type { ApprovalFilters } from '../use-approval-filters';
import { ApprovalSearchInput } from './approval-search-input';

const ALL = 'ALL';

export type ApprovalFilterBarProps = {
  filters: ApprovalFilters;
  compact: boolean;
  /** Someone delegated to the caller: "Chờ tôi duyệt" offers "Duyệt với tư cách". */
  delegate: boolean;
};

const AS = ['ALL', 'MINE', 'BEHALF'] as const;

export function ApprovalFilterBar({ filters, compact, delegate }: ApprovalFilterBarProps) {
  const { t } = useTranslation();
  const options = [{ value: ALL, label: t('approvals.filter.allTypes') }, ...APPROVAL_REQUEST_TYPES.map((type) => ({ value: type, label: t(`approvals.type.${type}`) }))];
  return (
    <div role="search" aria-label={t('approvals.filter.label')} className={cn('flex gap-3', compact ? 'flex-col' : 'flex-wrap items-center')}>
      <ApprovalSearchInput filters={filters} compact={compact} className={compact ? 'h-11' : 'w-72 min-[1440px]:w-80'} />
      <Select
        aria-label={t('approvals.filter.type')}
        value={filters.query.type || ALL}
        onChange={(value) => filters.setType(value === ALL ? '' : (value as ApprovalRequestType))}
        options={options}
        placeholder={t('approvals.filter.allTypes')}
        className={compact ? 'h-11 w-full' : 'w-60'}
      />
      {filters.query.box === 'WAITING' && (delegate || filters.query.onBehalf) ? (
        <Select
          aria-label={t('approvals.filter.as.label')}
          value={filters.query.onBehalf || 'ALL'}
          onChange={(value) => filters.setOnBehalf(value === 'ALL' ? '' : (value as ApprovalOnBehalf))}
          options={AS.map((as) => ({ value: as, label: t(`approvals.filter.as.${as}`) }))}
          placeholder={t('approvals.filter.as.ALL')}
          className={compact ? 'h-11 w-full' : 'w-60'}
        />
      ) : null}
      {filters.filtered ? (
        <Button variant="ghost" size="sm" className="shrink-0 self-start md:self-auto" onClick={filters.clear}>
          {t('approvals.filter.clear')}
        </Button>
      ) : null}
      {compact ? null : (
        <>
          <span className="flex-1" />
          <span className="text-caption text-ink-muted">{t(`approvals.filter.sort.${filters.query.box}`)}</span>
        </>
      )}
    </div>
  );
}
