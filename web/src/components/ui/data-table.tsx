// Library component "Table" on TanStack Table: sticky header, right-aligned numeric columns, client-side paging.
import {
  createColumnHelper,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type RowData,
} from '@tanstack/react-table';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Pagination } from './pagination';

const features = tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() });

export type DataTableColumn<T extends RowData> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Money, hours, days, %: right-aligned with tabular figures. */
  numeric?: boolean;
};

export type DataTableProps<T extends RowData> = {
  /** Accessible name of the table, e.g. "Danh sách nhân viên". */
  caption: string;
  columns: Array<DataTableColumn<T>>;
  data: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** Max height of the scroll area; the header stays visible while rows scroll. */
  maxHeight?: number;
  className?: string;
};

export function DataTable<T extends RowData>({ caption, columns, data, rowKey, pageSize = 20, maxHeight, className }: DataTableProps<T>) {
  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return columns.map((column) =>
      helper.display({
        id: column.id,
        header: () => column.header,
        cell: (context) => column.cell(context.row.original),
      }),
    );
  }, [columns]);
  const numeric = useMemo(() => new Set(columns.filter((c) => c.numeric).map((c) => c.id)), [columns]);

  const table = useTable({
    features,
    columns: tableColumns,
    data,
    getRowId: rowKey,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });
  const { pageIndex } = table.state.pagination;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* When the rows scroll, the scroll area is focusable so keyboard users can reach every row. */}
      <div
        className="overflow-auto rounded-md border border-line bg-surface"
        style={maxHeight ? { maxHeight } : undefined}
        {...(maxHeight ? { tabIndex: 0, role: 'region', 'aria-label': caption } : {})}
      >
        <table className="w-full border-separate border-spacing-0">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      'sticky top-0 border-b border-line bg-surface-muted px-3 py-2 text-left text-caption text-ink-muted',
                      numeric.has(header.column.id) && 'text-right whitespace-nowrap',
                    )}
                  >
                    <table.FlexRender header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="[&:last-child>td]:border-b-0">
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-b border-line p-3 align-middle',
                      numeric.has(cell.column.id) && 'text-right tabular-nums',
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > pageSize ? (
        <Pagination pageIndex={pageIndex} pageSize={pageSize} total={data.length} onPageChange={table.setPageIndex} />
      ) : null}
    </div>
  );
}
