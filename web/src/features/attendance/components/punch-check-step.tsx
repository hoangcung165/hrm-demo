// Step 2 of the import, "Kiểm tra": the numbers of the file, the rows with errors, and the way on. Rows with errors can
// be fixed in the file (back to step 1) or skipped. When every punch is stored already there is nothing to import (P10).
import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { companyDateIso, formatNumber } from '@/lib/format';
import type { PunchImport } from '../use-punch-import';
import { PunchCheckStats, punchRange } from './punch-check-stats';
import { PunchErrorsTable } from './punch-errors-table';

export function PunchCheckStep({ wizard }: { wizard: PunchImport }) {
  const { t } = useTranslation();
  const check = wizard.check!;
  const { newPunches: n, alreadyImported: k, errorRows: m, employees, rowsRead } = check.summary;

  if (n === 0 && m === 0 && k > 0) {
    // Importing the same file again: everything is stored already.
    const { from, to } = check.summary;
    const range = from && to ? `?from=${companyDateIso(from)}&to=${companyDateIso(to)}` : '';
    return (
      <Card bare>
        <EmptyState
          icon={<Copy />}
          title={t('attendanceImport.allExist.title', { k: formatNumber(k), count: k })}
          description={t('attendanceImport.allExist.text')}
          actions={
            <>
              <Button variant="secondary" onClick={wizard.restart}>
                {t('attendanceImport.anotherFile')}
              </Button>
              <Link to={`/attendance${range}`} className={buttonVariants()}>
                {t('attendanceImport.viewDaily')}
              </Link>
            </>
          }
        />
      </Card>
    );
  }

  const range = punchRange(check);
  return (
    <Card
      title={t('attendanceImport.checkTitle')}
      description={[
        check.fileName,
        t('attendanceImport.checkMeta', { employees: formatNumber(employees), count: employees, rows: formatNumber(rowsRead) }),
        range,
      ]
        .filter(Boolean)
        .join(' · ')}
      actions={
        <>
          <Button variant="secondary" onClick={wizard.restart}>
            {t(m > 0 && n > 0 ? 'attendanceImport.fixFile' : 'attendanceImport.anotherFile')}
          </Button>
          {n > 0 ? (
            <Button onClick={wizard.toConfirm}>
              {m > 0 ? t('attendanceImport.skipErrors', { m: formatNumber(m), count: m }) : t('attendanceImport.continue')}
            </Button>
          ) : null}
        </>
      }
    >
      <PunchCheckStats check={check} changed={wizard.changed} />
      {check.errors.length > 0 ? <PunchErrorsTable fileName={check.fileName} errors={check.errors} /> : null}
    </Card>
  );
}
