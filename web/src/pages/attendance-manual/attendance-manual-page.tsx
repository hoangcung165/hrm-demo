// Nhập công thủ công (HRM-24; Chấm công › Công theo ngày › Nhập công thủ công), `/attendance/manual`: the timekeeper
// enters the result of the days of people who have no machine to punch on. Needs ATTENDANCE_MANUAL; desktop-first, so
// below 768 px it says to open it on a computer (the no-permission state wins). Unit and week are in the URL.
import { ArrowLeft, Monitor, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBlock } from '@/components/ui/state-block';
import { ManualContent } from '@/features/attendance/components/manual-content';
import { useManualFilters } from '@/features/attendance/use-manual-filters';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

export function AttendanceManualPage() {
  const { t } = useTranslation();
  const allowed = useCurrentAccount().permissions.includes('ATTENDANCE_MANUAL');
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useManualFilters();
  const back = (
    <Link to="/attendance" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('attendanceImport.backToDaily')}
    </Link>
  );
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Link to="/attendance" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('attendanceImport.daily')}
        </Link>
        <h1 className="text-title">{t('attendanceManual.title')}</h1>
        <p className="max-w-200 text-body-small text-ink-muted">{t('attendanceManual.intro')}</p>
      </div>
      {!allowed ? (
        <Card bare>
          <StateBlock variant="denied" icon={<ShieldOff />} title={t('attendanceManual.denied.title')} description={t('attendanceManual.denied.text')} actions={back} />
        </Card>
      ) : compact ? (
        <Card bare>
          <EmptyState icon={<Monitor />} title={t('attendanceManual.desktopOnly.title')} description={t('attendanceManual.desktopOnly.text')} actions={back} />
        </Card>
      ) : (
        <ManualContent filters={filters} />
      )}
    </div>
  );
}
