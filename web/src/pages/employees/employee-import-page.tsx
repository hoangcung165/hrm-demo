// Nhập nhân viên từ Excel (HRM-07), `/employees/import`. Needs EMPLOYEE_EDIT; desktop-first, so below 768 px it
// says to open it on a computer (the no-permission state wins). The upload, check and confirm steps come with
// HRM-07/FE-2; until then the page offers the template.
import { ArrowLeft, FileSpreadsheet, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { EmployeeTemplateAlert } from '@/features/employee/components/employee-template-alert';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/lib/use-media-query';

export function EmployeeImportPage() {
  const { t } = useTranslation();
  const canImport = useCurrentAccount().permissions.includes('EMPLOYEE_EDIT');
  const compact = useMediaQuery('(max-width: 767px)');
  const back = (
    <Link to="/employees" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t('employees.placeholder.back')}
    </Link>
  );
  return (
    <div className="flex max-w-240 flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Link to="/employees" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 max-md:h-11')}>
          <ArrowLeft aria-hidden="true" className="!size-4" />
          {t('employees.title')}
        </Link>
        <h1 className="text-title">{t('employees.import.title')}</h1>
      </div>
      {!canImport ? (
        <Card bare>
          <StateBlock variant="denied" title={t('employees.import.denied.title')} description={t('employees.import.denied.text')} actions={back} />
        </Card>
      ) : compact ? (
        <Card bare>
          <EmptyState icon={<Monitor />} title={t('employees.import.desktopOnly.title')} description={t('employees.import.desktopOnly.text')} actions={back} />
        </Card>
      ) : (
        <Card title={t('employees.import.chooseFile')}>
          <div className="flex flex-col gap-4">
            <EmptyState icon={<FileSpreadsheet />} title={t('employees.import.comingSoon.title')} description={t('employees.import.comingSoon.text')} className="py-6" />
            <EmployeeTemplateAlert />
          </div>
        </Card>
      )}
    </div>
  );
}
