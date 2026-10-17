// Nghỉ phép (HRM-18, artboards `#18 Nghỉ phép của tôi` and its 390 version): the caller's Số dư phép per type and
// "Đơn của tôi" for a year, and "Tạo đơn nghỉ" (next to the title; pinned to the bottom at 390). An Account
// without an Employee has neither and gets a state that says so.
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useMediaQuery } from '@/lib/use-media-query';
import { LeaveBalancesBlock } from './leave-balances-block';
import { LeaveCreateLink } from './leave-create-link';
import { LeaveNoEmployee } from './leave-no-employee';
import { LeaveRequestsSection } from './leave-requests-section';
import { useLeaveYear } from './use-leave-year';

export function LeavePage() {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  const compact = useMediaQuery('(max-width: 767px)');
  const year = useLeaveYear();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t('leave.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/leave-calendar" className={buttonVariants({ variant: 'secondary' })}>
            <CalendarDays aria-hidden="true" />
            {t('leave.calendar.open')}
          </Link>
          {employeeId && !compact ? <LeaveCreateLink /> : null}
        </div>
      </div>
      {employeeId ? (
        <>
          <LeaveBalancesBlock year={year.value} />
          <LeaveRequestsSection year={year} compact={compact} />
          {compact ? <LeaveCreateLink sticky /> : null}
        </>
      ) : (
        <LeaveNoEmployee />
      )}
    </div>
  );
}
