// The rows of an import check, filtered by tabs with counts ("Dòng lỗi", "Đã có", "Hợp lệ", "Tất cả") and paged on
// the client, 50 rows a page: a file holds up to 1,000 rows and only one page is drawn.
import { CircleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import type { ImportCellError, ImportCheck, ImportRow } from '../import-api';
import { ImportRowDetail } from './import-row-detail';

export type ImportRowsTab = 'INVALID' | 'EXISTING' | 'VALID' | 'ALL';
const PAGE_SIZE = 50;

export type ImportRowsTableProps = {
  check: ImportCheck;
  /** Rows whose result changed at the last write attempt: captioned "Mới". */
  changedRows?: Set<number> | null;
  initialTab: ImportRowsTab;
};

export function ImportRowsTable({ check, changedRows, initialTab }: ImportRowsTableProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ImportRowsTab>(initialTab);
  const { summary } = check;
  const errorsByRow = useMemo(() => {
    const byRow = new Map<number, ImportCellError[]>();
    for (const error of check.errors) byRow.set(error.row, [...(byRow.get(error.row) ?? []), error]);
    return byRow;
  }, [check.errors]);
  const rows = useMemo(() => (tab === 'ALL' ? check.rows : check.rows.filter((row) => row.status === tab)), [check.rows, tab]);

  const columns = useMemo<Array<DataTableColumn<ImportRow>>>(
    () => [
      { id: 'row', header: t('employees.import.table.row'), numeric: true, className: 'w-18', cell: (row) => row.row },
      {
        id: 'fullName',
        header: t('employees.import.table.fullName'),
        className: 'w-55',
        cell: (row) => row.fullName ?? <span className="text-ink-muted">{t('employees.import.table.empty')}</span>,
      },
      { id: 'idNumber', header: t('employees.import.table.idNumber'), className: 'w-35 tabular-nums', cell: (row) => row.idNumber ?? '' },
      {
        id: 'result',
        header: t('employees.import.table.result'),
        className: 'w-30',
        cell: (row) => (
          <span className="flex flex-col items-start gap-1">
            {row.status === 'INVALID' ? (
              <Badge variant="danger">
                <CircleAlert aria-hidden="true" />
                {t('employees.import.status.INVALID')}
              </Badge>
            ) : (
              <Badge variant={row.status === 'VALID' ? 'success' : 'neutral'}>{t(`employees.import.status.${row.status}`)}</Badge>
            )}
            {changedRows?.has(row.row) ? <span className="text-caption text-brand-blue">{t('employees.import.table.changed')}</span> : null}
          </span>
        ),
      },
      { id: 'detail', header: t('employees.import.table.detail'), cell: (row) => <ImportRowDetail row={row} errors={errorsByRow.get(row.row) ?? []} /> },
    ],
    [t, errorsByRow, changedRows],
  );

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        label={t('employees.import.tabs.label')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'INVALID', label: t('employees.import.tabs.INVALID'), count: summary.errorRows },
          { id: 'EXISTING', label: t('employees.import.tabs.EXISTING'), count: summary.existingRows },
          { id: 'VALID', label: t('employees.import.tabs.VALID'), count: summary.validRows },
          { id: 'ALL', label: t('employees.import.tabs.ALL'), count: summary.totalRows },
        ]}
        panelClassName="pt-3"
      >
        {rows.length === 0 ? (
          <p className="py-6 text-center text-ink-muted">{t('employees.import.tabs.none')}</p>
        ) : (
          // A new tab starts at page 1.
          <DataTable
            key={tab}
            caption={t('employees.import.table.caption', { fileName: check.fileName })}
            columns={columns}
            data={rows}
            rowKey={(row) => String(row.row)}
            pageSize={PAGE_SIZE}
            summary={({ from, to, total }) => t('employees.import.table.pagination', { from, to, total })}
            maxHeight={640}
          />
        )}
      </Tabs>
    </div>
  );
}
