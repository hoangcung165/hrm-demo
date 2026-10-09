// Nhập nhân viên từ Excel (HRM-07), `/employees/import`: the wizard Tải lên → Kiểm tra → Xác nhận. Needs
// EMPLOYEE_EDIT; desktop-first, so below 768 px it says to open it on a computer (the no-permission state wins).
import { ArrowLeft, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EmployeeImportWizard } from '@/features/employee/components/employee-import-wizard';
import { useEmployeeImport } from '@/features/employee/use-employee-import';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/lib/use-media-query';

export function EmployeeImportPage() {
  const { t } = useTranslation();
  const canImport = useCurrentAccount().permissions.includes('EMPLOYEE_EDIT');
  const compact = useMediaQuery('(max-width: 767px)');
  const wizard = useEmployeeImport();
  const back = (
    <Link to="/employees" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('employees.placeholder.back')}
    </Link>
  );
  return (
    <div className="flex max-w-300 flex-col gap-4 md:gap-6" aria-busy={wizard.writing || undefined}>
      <div className="flex flex-col items-start gap-2">
        <Link to="/employees" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('employees.title')}
        </Link>
        <h1 className="text-title">{t('employees.import.title')}</h1>
      </div>
      {!canImport || wizard.denied ? (
        <Card bare>
          <StateBlock variant="denied" title={t('employees.import.denied.title')} description={t('employees.import.denied.text')} actions={back} />
        </Card>
      ) : compact ? (
        <Card bare>
          <EmptyState icon={<Monitor />} title={t('employees.import.desktopOnly.title')} description={t('employees.import.desktopOnly.text')} actions={back} />
        </Card>
      ) : (
        <EmployeeImportWizard wizard={wizard} />
      )}
    </div>
  );
}
