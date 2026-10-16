// "Đơn của tôi" of the chosen year (artboard `#18 Nghỉ phép của tôi`): the table, or a state when there is none yet
// or the list did not load. The year Select sits beside the title.
import { CalendarPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Select } from '@/components/ui/select';
import { StateBlock } from '@/components/ui/state-block';
import { useMyLeaveRequests } from '@/features/leave/api';
import { LeaveRequestTable } from '@/features/leave/components/leave-request-table';
import type { LeaveYear } from './use-leave-year';

export type LeaveRequestsSectionProps = { year: LeaveYear; compact: boolean };

export function LeaveRequestsSection({ year, compact }: LeaveRequestsSectionProps) {
  const { t } = useTranslation();
  const list = useMyLeaveRequests(year.value, year.page);
  const yearSelect = (
    <Select
      aria-label={t('leave.list.year')}
      value={String(year.value)}
      onChange={(value) => year.setYear(Number(value))}
      options={year.options.map((option) => ({ value: String(option), label: String(option) }))}
      placeholder={t('leave.list.year')}
      className="w-28 max-md:h-11"
    />
  );
  const empty = list.isSuccess && list.data.total === 0;
  return (
    <Card title={t('leave.list.title')} titleAside={yearSelect}>
      {list.isError ? (
        <ErrorState title={t('leave.list.loadError')} description={t('state.errorHint')} onRetry={() => void list.refetch()} />
      ) : empty ? (
        <StateBlock
          variant="empty"
          icon={<CalendarPlus />}
          title={t('leave.list.emptyTitle', { year: year.value })}
          description={t('leave.list.emptyText')}
          actions={
            <Link to="/leave/new" className={buttonVariants()}>
              {t('leave.create')}
            </Link>
          }
        />
      ) : (
        <LeaveRequestTable
          caption={t('leave.list.caption', { year: year.value })}
          rows={list.data?.items ?? []}
          total={list.data?.total ?? 0}
          pageIndex={year.page}
          onPageChange={year.setPage}
          loading={list.isPending}
          busy={list.isPlaceholderData}
          compact={compact}
        />
      )}
    </Card>
  );
}
