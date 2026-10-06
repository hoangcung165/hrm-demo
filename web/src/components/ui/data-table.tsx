// Library component "Table" on TanStack Table: sticky header, right-aligned numeric columns, Pagination below.
// Paging is client-side by default; with `pageIndex`, `total` and `onPageChange` the server pages and `data` is one page.
// `variant="compact"` (below 768px) shows the same records as compact rows (`DataRows`).
import { createColumnHelper, createPaginatedRowModel, rowPaginationFeature, tableFeatures, useTable, type RowData } from '@tanstack/react-table';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DataRows, type DataRowsLayout } from './data-rows';
import { Pagination, type PaginationProps } from './pagination';
import { rowClicked } from './row-clicked';
import { Skeleton } from './skeleton';

const features = tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() });

export type DataTableColumn<T extends RowData> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Money, hours, days, %: right-aligned with tabular figures. */
  numeric?: boolean;
  /** The header is for screen readers only: the actions column ("Thao tác"). */
  headerHidden?: boolean;
  /** Width of the column, e.g. `w-38`; the column without one takes what is left. */
  className?: string;
  /** Loading placeholder of the cell: `person` is a circle and two bars. A bar by default. */
  skeleton?: 'person' | 'bar';
};

export type DataTableProps<T extends RowData> = {
  /** Accessible name of the table, e.g. "Danh sách nhân viên". */
  caption: string;
  columns: Array<DataTableColumn<T>>;
  /** Every row (client paging), or the rows of the current page (server paging). */
  data: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** Server paging: the zero-based page that `data` holds. Needs `total` and `onPageChange`. */
  pageIndex?: number;
  /** Server paging: how many rows match on the server. */
  total?: number;
  /** Server paging: the user asked for another page. */
  onPageChange?: (pageIndex: number) => void;
  /** The Pagination summary with the record type. */
  summary?: PaginationProps['summary'];
  /** Loading: the header stays, the rows are Skeletons, the container is busy and named by `loadingLabel`. */
  loading?: boolean;
  loadingLabel?: string;
  /** How many Skeleton rows. */
  loadingRows?: number;
  /** `compact` needs `rows`. */
  variant?: 'default' | 'compact';
  /** Compact rows: which cell is the lead, which Badges go on line two, and the row action. */
  rows?: DataRowsLayout<T>;
  /** Max height of the scroll area; the header stays visible while rows scroll. */
  maxHeight?: number;
  /** The rows of the next page or filter are on their way: the current rows stay, and the list is `aria-busy`. */
  busy?: boolean;
  /**
   * The whole row opens the record. The row still needs a link in it (e.g. the name), which is what keyboard and
   * screen reader users reach; a click on a link or button inside the row is left to it.
   */
  onRowClick?: (row: T) => void;
  className?: string;
};

const HEAD = 'sticky top-0 border-b border-line bg-surface-muted px-3 py-2 text-left text-caption text-ink-muted';
const CELL = 'border-b border-line p-3 align-middle';

export function DataTable<T extends RowData>(props: DataTableProps<T>) {
  const { caption, columns, data, rowKey, pageSize = 20, total, onPageChange, summary, loading = false, loadingLabel, loadingRows = 6, variant = 'default', rows, maxHeight, busy = false, onRowClick, className } = props;
  const server = props.pageIndex !== undefined && total !== undefined && onPageChange !== undefined;
  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return columns.map((column) => helper.display({ id: column.id, header: () => column.header, cell: (context) => column.cell(context.row.original) }));
  }, [columns]);
  const byId = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);

  // Server paging: `data` is already one page, so the table shows all of it.
  const table = useTable({ features, columns: tableColumns, data, getRowId: rowKey, manualPagination: server, initialState: { pagination: { pageIndex: 0, pageSize } } });
  const pageIndex = server ? props.pageIndex! : table.state.pagination.pageIndex;
  const count = server ? total! : data.length;
  const compact = variant === 'compact' && rows !== undefined;
  const visible = table.getRowModel().rows;

  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy={(busy && !loading) || undefined}>
      {compact ? (
        <DataRows
          label={loading ? (loadingLabel ?? caption) : caption}
          data={visible.map((row) => row.original)}
          rowKey={rowKey}
          loadingRows={loading ? loadingRows : 0}
          onRowClick={onRowClick}
          {...rows}
        />
      ) : (
        // When the rows scroll, the scroll area is focusable so keyboard users can reach every row.
        <div
          className="overflow-auto rounded-md border border-line bg-surface"
          style={maxHeight ? { maxHeight } : undefined}
          aria-busy={loading || undefined}
          {...(loading ? { role: 'status', 'aria-label': loadingLabel ?? caption } : maxHeight ? { tabIndex: 0, role: 'region', 'aria-label': caption } : {})}
        >
          <table className="w-full border-separate border-spacing-0">
            <caption className="sr-only">{caption}</caption>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} scope="col" className={cn(HEAD, byId.get(header.column.id)?.numeric && 'text-right whitespace-nowrap', byId.get(header.column.id)?.className)}>
                      {byId.get(header.column.id)?.headerHidden ? (
                        <span className="sr-only">
                          <table.FlexRender header={header} />
                        </span>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: loadingRows }, (_, index) => (
                    <tr key={index} className="[&:last-child>td]:border-b-0">
                      {columns.map((column) => (
                        <td key={column.id} className={CELL}>
                          {column.skeleton === 'person' ? (
                            <span className="flex items-center gap-3">
                              <Skeleton shape="circle" className="size-6" />
                              <span className="flex flex-1 flex-col gap-2">
                                <Skeleton className={index % 2 ? 'w-[38%]' : 'w-[46%]'} />
                                <Skeleton className={index % 2 ? 'w-[70%]' : 'w-[62%]'} />
                              </span>
                            </span>
                          ) : (
                            <Skeleton className="w-[70%]" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                : visible.map((row) => (
                    <tr
                      key={row.id}
                      onClick={onRowClick ? (event) => rowClicked(event, () => onRowClick(row.original)) : undefined}
                      className={cn('[&:last-child>td]:border-b-0', onRowClick && 'cursor-pointer hover:bg-surface-muted')}
                    >
                      {row.getAllCells().map((cell) => (
                        <td key={cell.id} className={cn(CELL, byId.get(cell.column.id)?.numeric && 'text-right tabular-nums')}>
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      {/* The server-paged list always states how much is shown; client paging only when there is a second page. */}
      {!loading && (server ? count > 0 : count > pageSize) ? (
        <Pagination pageIndex={pageIndex} pageSize={pageSize} total={count} onPageChange={server ? onPageChange! : table.setPageIndex} summary={summary} variant={compact ? 'compact' : 'default'} />
      ) : null}
    </div>
  );
}
