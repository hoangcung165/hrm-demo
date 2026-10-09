// Step 2 of the import, "Kiểm tra": the summary, the rows by result, and the way on. Rows with errors can be fixed in
// the file (back to step 1) or skipped. When every row already exists there is nothing to import (P10 state).
import { UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatNumber } from '@/lib/format';
import type { EmployeeImport } from '../use-employee-import';
import { ImportCheckSummary } from './import-check-summary';
import { ImportRowsTable } from './import-rows-table';

export function ImportCheckStep({ wizard }: { wizard: EmployeeImport }) {
  const { t } = useTranslation();
  const [showExisting, setShowExisting] = useState(false);
  const check = wizard.check!;
  const { validRows: n, errorRows: m, existingRows: k } = check.summary;
  const allExist = n === 0 && m === 0 && k > 0;

  if (allExist && !showExisting) {
    return (
      <Card bare>
        <EmptyState
          icon={<UserCheck />}
          title={t('employees.import.allExist.title', { k: formatNumber(k), count: k })}
          description={t('employees.import.allExist.text')}
          actions={
            <>
              <Button variant="secondary" onClick={wizard.restart}>
                {t('employees.import.anotherFile')}
              </Button>
              <Link to="/employees" className={buttonVariants()}>
                {t('employees.placeholder.back')}
              </Link>
            </>
          }
        />
        <div className="flex justify-center pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowExisting(true)}>
            {t('employees.import.allExist.details')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={t('employees.import.checkTitle')}
      actions={
        <>
          <Button variant="secondary" onClick={wizard.restart}>
            {t(m > 0 && n > 0 ? 'employees.import.fixFile' : 'employees.import.anotherFile')}
          </Button>
          {n > 0 ? (
            <Button onClick={wizard.toConfirm}>{m > 0 ? t('employees.import.skipErrors', { m: formatNumber(m), count: m }) : t('employees.import.continue')}</Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ImportCheckSummary check={check} changedCount={wizard.changedRows?.size} />
        <ImportRowsTable
          key={`${check.checksum}-${wizard.changedRows?.size ?? ''}`}
          check={check}
          changedRows={wizard.changedRows}
          initialTab={allExist ? 'EXISTING' : m > 0 ? 'INVALID' : 'VALID'}
        />
      </div>
    </Card>
  );
}
