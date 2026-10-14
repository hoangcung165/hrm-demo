// Library component "Heatmap" (`hrm-heatmap`): people against weeks or months, one Heatmap cell each. The header and the
// first column stay in place while the rest scrolls inside the container; the current column is marked in the header
// and tinted. Numbers are always printed in the cells (colour is never the only signal). Read-only.
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HeatCell, type HeatThresholds } from './heat-cell';
import { Skeleton } from './skeleton';

/** `label`: the visible header ("12/10"); `name`: read out by a screen reader ("Tuần 42, 12/10 – 18/10"). */
export type HeatmapGridColumn = { id: string; label: string; name: string; current?: boolean };

/** A month over `span` week columns. */
export type HeatmapGridMonth = { id: string; label: string; span: number };

export type HeatmapGridRow = {
  id: string;
  /** The first cell of the row: who it is about. */
  lead: ReactNode;
  /** The load of each column, in the order of `columns`. */
  cells: Array<{ percent: number; label: string }>;
};

/** The cell that is open in a detail panel: its row stays marked and the cell keeps a ring. */
export type HeatmapGridSelection = { rowId: string; columnIndex: number };

export type HeatmapGridProps = {
  /** Accessible name of the table and of its scroll region. */
  caption: string;
  /** Header of the first column, e.g. "Nhân viên". */
  leadHeader: string;
  columns: HeatmapGridColumn[];
  /** The month row above the week row; omit for a monthly heatmap. */
  months?: HeatmapGridMonth[];
  rows: HeatmapGridRow[];
  thresholds?: HeatThresholds;
  /** Makes every cell a button; the cell's own label names it. Called with the row and the column index. */
  onCellSelect?: (rowId: string, columnIndex: number) => void;
  selected?: HeatmapGridSelection | null;
  /** Loading: the header stays, the rows are Skeletons, the container is busy and named by `loadingLabel`. */
  loading?: boolean;
  loadingLabel?: string;
  loadingRows?: number;
  /** A newer query runs: the rows stay, dimmed. */
  busy?: boolean;
  /** Narrow screen: slimmer first column and columns. */
  compact?: boolean;
  className?: string;
};

const HEAD = 'border-b border-line bg-surface-muted px-1 py-2 text-center text-caption text-ink-muted';
const LEAD = 'sticky left-0 z-10 border-r border-line text-left';

export function HeatmapGrid({ caption, leadHeader, columns, months, rows, thresholds, onCellSelect, selected, loading = false, loadingLabel, loadingRows = 8, busy = false, compact = false, className }: HeatmapGridProps) {
  const leadWidth = compact ? 'w-40 min-w-40 max-w-40' : 'w-64 min-w-64 max-w-64';
  const columnWidth = compact ? 'w-20 min-w-20' : 'w-18 min-w-18';
  return (
    <div
      role="region"
      aria-label={caption}
      aria-busy={loading || busy || undefined}
      tabIndex={0}
      className={cn('max-h-[70vh] overflow-auto rounded-md border border-line bg-surface focus-visible:shadow-focus-ring', className)}
    >
      <table className={cn('w-max min-w-full border-separate border-spacing-0', busy && 'opacity-60')}>
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-20">
          {months ? (
            <tr>
              <th scope="col" rowSpan={2} className={cn(HEAD, LEAD, 'top-0 z-30 px-3 text-left text-body-strong text-ink', leadWidth)}>
                {leadHeader}
              </th>
              {months.map((month) => (
                <th key={month.id} scope="colgroup" colSpan={month.span} className={cn(HEAD, 'border-l border-line text-left text-body-strong text-ink')}>
                  <span className="px-2">{month.label}</span>
                </th>
              ))}
            </tr>
          ) : null}
          <tr>
            {months ? null : (
              <th scope="col" className={cn(HEAD, LEAD, 'z-30 px-3 text-left text-body-strong text-ink', leadWidth)}>
                {leadHeader}
              </th>
            )}
            {columns.map((column) => (
              <th key={column.id} scope="col" aria-current={column.current ? 'date' : undefined} className={cn(HEAD, columnWidth, column.current && 'border-b-2 border-b-brand-blue bg-brand-blue-soft font-medium text-brand-blue')}>
                <span aria-hidden="true">{column.label}</span>
                <span className="sr-only">{column.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: loadingRows }, (_, i) => (
                <tr key={i}>
                  <th scope="row" className={cn('border-b border-line bg-surface px-3 py-2', LEAD, leadWidth)}>
                    <Skeleton className="w-3/4" />
                  </th>
                  {columns.map((column) => (
                    <td key={column.id} className="border-b border-line px-1 py-2 text-center">
                      <Skeleton shape="control" className="mx-auto h-7 w-16" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={cn('border-b border-line bg-surface px-3 py-2 font-normal', LEAD, leadWidth, selected?.rowId === row.id && 'shadow-[inset_3px_0_0_0] shadow-brand-blue')}>
                    {row.lead}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={columns[i]?.id ?? i} className={cn('border-b border-line px-1 py-2 text-center', columns[i]?.current && 'bg-surface-muted')}>
                      {onCellSelect ? (
                        <button
                          type="button"
                          aria-pressed={selected?.rowId === row.id && selected.columnIndex === i}
                          onClick={(event) => {
                            // Safari does not focus a clicked button: the drawer needs it as the opener to give focus back.
                            event.currentTarget.focus();
                            onCellSelect(row.id, i);
                          }}
                          className="cursor-pointer rounded-sm focus-visible:shadow-focus-ring aria-pressed:shadow-focus-ring"
                        >
                          <HeatCell percent={cell.percent} label={cell.label} size="sm" thresholds={thresholds} />
                        </button>
                      ) : (
                        <HeatCell percent={cell.percent} label={cell.label} size="sm" thresholds={thresholds} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {loading && loadingLabel ? <span role="status" aria-label={loadingLabel} /> : null}
    </div>
  );
}
