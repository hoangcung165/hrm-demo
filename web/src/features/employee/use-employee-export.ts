// "Xuất Excel" on the employee list: one export at a time, then a Toast with the file name, or why it failed.
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { formatNumber } from '@/lib/format';
import type { EmployeeListQuery } from './api';
import { tooManyRows, useExportEmployees } from './excel-api';

export function useEmployeeExport() {
  const { t } = useTranslation();
  const toast = useToast();
  const exporting = useExportEmployees();
  const run = (query: EmployeeListQuery) => {
    if (exporting.isPending) return;
    exporting.mutate(query, {
      onSuccess: ({ fileName, total }) =>
        toast({ variant: 'success', message: t('employees.excel.exported', { count: total, n: formatNumber(total), fileName }) }),
      onError: (error) => {
        const tooMany = tooManyRows(error);
        toast(
          tooMany
            ? {
                variant: 'danger',
                message: t('employees.excel.tooManyRows', { total: formatNumber(tooMany.total), limit: formatNumber(tooMany.limit) }),
                detail: t('employees.excel.tooManyRowsFix'),
              }
            : { variant: 'danger', message: t('employees.excel.exportFailed') },
        );
      },
    });
  };
  return { run, busy: exporting.isPending };
}
