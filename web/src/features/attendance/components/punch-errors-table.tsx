// The rows with errors of a check, filtered by kind in tabs with counts and paged on the client, 10 rows a page. The list
// can be saved as a CSV that is built here from the check (the server lists at most 1,000 rows).
import { CircleAlert, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { formatNumber } from '@/lib/format';
import { kindOfCode, KIND_ORDER, type ErrorKind } from '../error-kinds';
import type { PunchImportError } from '../import-api';
import { rowErrorMessage } from '../import-messages';
import { saveErrorList } from '../import-template';

const PAGE_SIZE = 10;

export type PunchErrorsTableProps = { fileName: string; errors: PunchImportError[] };

export function PunchErrorsTable({ fileName, errors }: PunchErrorsTableProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ErrorKind>('ALL');
  const counts = useMemo(() => {
    const byKind = new Map<ErrorKind, number>([['ALL', errors.length]]);
    for (const error of errors) byKind.set(kindOfCode(error.code), (byKind.get(kindOfCode(error.code)) ?? 0) + 1);
    return byKind;
  }, [errors]);
  const rows = useMemo(() => (kind === 'ALL' ? errors : errors.filter((error) => kindOfCode(error.code) === kind)), [errors, kind]);
  const tabs = [{ id: 'ALL' as ErrorKind, label: t('attendanceImport.kind.ALL'), count: errors.length }].concat(
    KIND_ORDER.filter((id) => counts.has(id)).map((id) => ({ id, label: t(`attendanceImport.kind.${id}`), count: counts.get(id)! })),
  );

  const columns = useMemo<Array<DataTableColumn<PunchImportError>>>(
    () => [
      { id: 'row', header: t('attendanceImport.table.row'), numeric: true, className: 'w-18', cell: (error) => formatNumber(error.row) },
      {
        id: 'value',
        header: t('attendanceImport.table.value'),
        className: 'w-48 tabular-nums',
        // The cell the problem is in: the code for the errors about the code, the time as written for the others.
        cell: (error) => error.value || <span className="text-ink-muted">{t('attendanceImport.table.empty')}</span>,
      },
      {
        id: 'error',
        header: t('attendanceImport.table.error'),
        className: 'w-44',
        cell: (error) => (
          <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-danger">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0 stroke-[1.5]" />
            {t(`attendanceImport.errorLabel.${error.code}`)}
          </span>
        ),
      },
      { id: 'fix', header: t('attendanceImport.table.fix'), cell: (error) => rowErrorMessage(error, t) },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="ghost"
        size="sm"
        className="self-end"
        onClick={() =>
          saveErrorList(
            errors,
            (error) => rowErrorMessage(error, t),
            [t('attendanceImport.csv.row'), t('attendanceImport.csv.value'), t('attendanceImport.csv.code'), t('attendanceImport.csv.fix')],
            `${fileName.replace(/\.[^.]+$/, '')}-loi.csv`,
          )
        }
      >
        <Download aria-hidden="true" />
        {t('attendanceImport.downloadErrors')}
      </Button>
      <Tabs label={t('attendanceImport.tabs.label')} active={kind} onChange={setKind} tabs={tabs} scrollable panelClassName="pt-3">
        {/* A new tab starts at page 1. */}
        <DataTable
          key={kind}
          caption={t('attendanceImport.table.caption', { fileName })}
          columns={columns}
          data={rows}
          rowKey={(error) => `${error.row}-${error.code}`}
          pageSize={PAGE_SIZE}
          summary={({ from, to, total }) => t('attendanceImport.table.pagination', { from, to, total })}
        />
      </Tabs>
    </div>
  );
}
