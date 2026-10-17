// Lịch nghỉ phép (HRM-19): who is off, by week or month, over the part of the company the Account may see. Approved
// leave and leave still waiting are both there, told apart by shape and words. The range and filters are in the URL.
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { LeaveCalendarContent } from '@/features/leave/components/leave-calendar-content';
import { useCalendarFilters } from '@/features/leave/use-calendar-filters';

export function LeaveCalendarPage() {
  const { t } = useTranslation();
  const filters = useCalendarFilters();
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-title">{t('leave.calendar.title')}</h1>
          <p className="text-body-small text-ink-muted">{t('leave.calendar.intro')}</p>
        </div>
        <Link to="/leave" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('leave.calendar.backToLeave')}
        </Link>
      </div>
      <LeaveCalendarContent filters={filters} />
    </div>
  );
}
