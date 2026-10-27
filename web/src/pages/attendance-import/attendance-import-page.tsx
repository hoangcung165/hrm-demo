// Nhập log quẹt thẻ (HRM-23; Chấm công › Công theo ngày › Nhập log), `/attendance/import`: the wizard Tải lên → Kiểm tra →
// Xác nhận. Needs ATTENDANCE_IMPORT; desktop-first, so below 768 px it says to open it on a computer (the no-permission
// state wins).
import { ArrowLeft, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBlock } from '@/components/ui/state-block';
import { PunchImportWizard } from '@/features/attendance/components/punch-import-wizard';
import { usePunchImport } from '@/features/attendance/use-punch-import';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

export function AttendanceImportPage() {
  const { t } = useTranslation();
  const canImport = useCurrentAccount().permissions.includes('ATTENDANCE_IMPORT');
  const compact = useMediaQuery('(max-width: 767px)');
  const wizard = usePunchImport();
  const back = (
    <Link to="/attendance" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('attendanceImport.backToDaily')}
    </Link>
  );
  return (
    <div className="flex max-w-300 flex-col gap-4 md:gap-6" aria-busy={wizard.writing || undefined}>
      <div className="flex flex-col items-start gap-2">
        <Link to="/attendance" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('attendanceImport.daily')}
        </Link>
        <h1 className="text-title">{t('attendanceImport.title')}</h1>
      </div>
      {!canImport || wizard.denied ? (
        <Card bare>
          <StateBlock variant="denied" title={t('attendanceImport.denied.title')} description={t('attendanceImport.denied.text')} actions={back} />
        </Card>
      ) : compact ? (
        <Card bare>
          <EmptyState icon={<Monitor />} title={t('attendanceImport.desktopOnly.title')} description={t('attendanceImport.desktopOnly.text')} actions={back} />
        </Card>
      ) : (
        <PunchImportWizard wizard={wizard} />
      )}
    </div>
  );
}
