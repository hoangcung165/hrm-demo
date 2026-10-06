// Library component "Table", matrix variant: a read-only grid of rows against a fixed set of columns
// (permissions against roles). The first column stays in place while the value columns scroll sideways
// inside the container; the page itself never scrolls sideways.
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export type MatrixColumn = { id: string; label: string };

export type MatrixRow =
  /** A text row, e.g. the data scope of each role. `values` follow the columns. */
  | { id: string; label: string; kind: 'text'; values: string[] }
  /** A yes / no row. `values` follow the columns. */
  | { id: string; label: string; kind?: 'check'; values: boolean[] };

/** Rows under one group row; a group without a label leads the body with no group row. */
export type MatrixGroup = { id: string; label?: string; rows: MatrixRow[] };

export type MatrixProps = {
  /** Accessible name of the table and of its scroll region. */
  caption: string;
  /** Header of the first column, e.g. "Quyền". */
  leadHeader: string;
  columns: MatrixColumn[];
  groups: MatrixGroup[];
  /** Hidden text of a granted and of a not granted cell: "Có", "Không". */
  yesLabel: string;
  noLabel: string;
  /** Shown above the container below 768px: "Vuốt ngang để xem các vai trò khác". */
  scrollHint?: string;
  /** Loading: the header stays, the rows are Skeletons, the container is busy and named by `loadingLabel`. */
  loading?: boolean;
  loadingLabel?: string;
  loadingRows?: number;
  className?: string;
};

const HEAD = 'border-b border-line bg-surface-muted px-3 py-2 text-caption text-ink-muted';
// The first column: sticky on the left, over the value cells that scroll under it.
const LEAD = 'sticky left-0 border-r border-b border-line text-left';
// 14/20 is the design system's size for the text row of a matrix; there is no text token for it.
const TEXT = 'text-[14px] leading-5 font-medium';
const CELL = 'w-30 border-b border-line px-2 py-3 text-center align-middle';
const LAST = '[tbody:last-child>tr:last-child>&]:border-b-0';
const LEAD_WIDTHS = ['w-[62%]', 'w-[48%]', 'w-[70%]', 'w-[55%]'];

export function Matrix({ caption, leadHeader, columns, groups, yesLabel, noLabel, scrollHint, loading = false, loadingLabel, loadingRows = 7, className }: MatrixProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {scrollHint ? (
        <p className="flex items-center gap-1 text-caption text-ink-muted md:hidden">
          <ChevronRight aria-hidden="true" className="size-3.5 stroke-[1.5]" />
          {scrollHint}
        </p>
      ) : null}
      {/* Focusable, so the keyboard can scroll it sideways. `relative`: the hidden texts of the cells are positioned
          against it, so they scroll and clip with the table instead of widening the page. */}
      <div
        tabIndex={0}
        aria-busy={loading || undefined}
        role={loading ? 'status' : 'region'}
        aria-label={loading ? (loadingLabel ?? caption) : caption}
        className="relative overflow-x-auto rounded-md border border-line bg-surface"
      >
        {/* Never narrower than a 168px first column and 120px a value column (Table README, "Matrix"). */}
        <table className="w-full table-fixed border-separate border-spacing-0" style={{ minWidth: `calc(var(--spacing) * ${42 + 30 * columns.length})` }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(HEAD, LEAD, 'z-2')}>
                {leadHeader}
              </th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className={cn(HEAD, 'w-30 px-2 text-center')}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          {loading ? (
            <tbody>
              {Array.from({ length: loadingRows }, (_, index) => (
                <tr key={index}>
                  <td className={cn(LEAD, LAST, 'z-1 bg-surface p-3')}>
                    <Skeleton className={LEAD_WIDTHS[index % LEAD_WIDTHS.length]} />
                  </td>
                  {columns.map((column) => (
                    <td key={column.id} className={cn(CELL, LAST)}>
                      <Skeleton className="mx-auto w-5" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : (
            groups.map((group) => (
              <tbody key={group.id}>
                {group.label ? (
                  <tr>
                    <th scope="rowgroup" className={cn(LEAD, 'z-1 bg-surface-muted px-3 py-2 text-caption text-ink-muted')}>
                      {group.label}
                    </th>
                    <td colSpan={columns.length} className="border-b border-line bg-surface-muted" />
                  </tr>
                ) : null}
                {group.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className={cn(LEAD, LAST, 'z-1 bg-surface p-3 text-body text-ink', row.kind === 'text' ? 'font-medium' : 'font-normal')}>
                      {row.label}
                    </th>
                    {row.kind === 'text'
                      ? row.values.map((value, index) => (
                          <td key={columns[index]?.id ?? index} className={cn(CELL, LAST, TEXT)}>
                            {value}
                          </td>
                        ))
                      : row.values.map((granted, index) => (
                          // Yes and no differ in shape, not only in colour; never an empty cell.
                          <td key={columns[index]?.id ?? index} className={cn(CELL, LAST, granted ? 'text-success' : 'text-ink-muted')}>
                            {granted ? <Check aria-hidden="true" className="inline size-5 stroke-2" /> : <span aria-hidden="true">–</span>}
                            <span className="sr-only">{granted ? yesLabel : noLabel}</span>
                          </td>
                        ))}
                  </tr>
                ))}
              </tbody>
            ))
          )}
        </table>
      </div>
    </div>
  );
}
