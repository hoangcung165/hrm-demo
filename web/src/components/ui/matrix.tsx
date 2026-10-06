// Library component "Table", matrix variant: a grid of rows against a fixed set of columns (permissions against
// roles), read-only or, with `edit` on its cells, editable. The first column stays in place while the value
// columns scroll sideways inside the container; the page itself never scrolls sideways.
import { ChevronRight, Lock } from 'lucide-react';
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { MatrixCell, type MatrixCellEdit } from './matrix-cell';
import { Skeleton } from './skeleton';
import { useMatrixNavigation } from './use-matrix-navigation';

/** `note`: why the column is locked ("Đủ mọi quyền"). `changes`: its unsaved changes ("2 thay đổi"). */
export type MatrixColumn = { id: string; label: string; note?: string; changes?: string };

export type MatrixRow =
  /** A text row, e.g. the data scope of each role. `values` follow the columns. `note`: why the row is fixed. */
  | { id: string; label: string; note?: string; kind: 'text'; values: string[] }
  /** A yes / no row. `values` follow the columns; with `edit` (one per column) its cells are boxes or locked checks. */
  | { id: string; label: string; note?: string; kind?: 'check'; values: boolean[]; edit?: MatrixCellEdit[] };

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
  /** Shown above the container while the table is wider than it: "Vuốt ngang để xem các vai trò khác". */
  scrollHint?: string;
  /** Loading: the header stays, the rows are Skeletons, the container is busy and named by `loadingLabel`. */
  loading?: boolean;
  loadingLabel?: string;
  loadingRows?: number;
  /** Editable matrix: hidden description of a changed cell ("Đã đổi, chưa lưu"). */
  changedLabel?: string;
  /** Editable matrix: a save runs, the boxes cannot be changed. */
  saving?: boolean;
  /** Editable matrix: hidden text on how the keyboard moves between cells. */
  keyboardHint?: string;
  onToggle?: (rowId: string, columnId: string) => void;
  /** The scroll region, e.g. to move focus to it. */
  regionRef?: Ref<HTMLDivElement>;
  className?: string;
};

/** Why a header's column or row is locked: a 14px lock and a caption line. */
function Note({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('mt-0.5 flex items-start gap-1 text-caption text-ink-muted', className)}>
      <Lock aria-hidden="true" className="mt-px size-3.5 shrink-0 stroke-[1.5]" />
      {text}
    </span>
  );
}

const HEAD = 'border-b border-line bg-surface-muted px-3 py-2 text-caption text-ink-muted';
// The first column: sticky on the left, over the value cells that scroll under it.
const LEAD = 'sticky left-0 border-r border-b border-line text-left';
// Value columns: 104px, and 120px once the container is 1008px wide (Table README, "Matrix").
const COLUMN = 'w-26 @[63rem]:w-30';
const CELL = 'border-b border-line px-2 py-3 text-center align-middle';
const LAST = '[tbody:last-child>tr:last-child>&]:border-b-0';
const LEAD_WIDTHS = ['w-[62%]', 'w-[48%]', 'w-[70%]', 'w-[55%]'];

export function Matrix(props: MatrixProps) {
  const { caption, leadHeader, columns, groups, yesLabel, noLabel, scrollHint, loading = false, loadingLabel, loadingRows = 7, changedLabel, saving = false, keyboardHint, onToggle, regionRef, className } = props;
  const changedId = useId();
  const hintId = useId();
  // Editable: the yes / no rows with cells to edit form one grid for the keyboard, in display order.
  const gridRows = groups.flatMap((group) => group.rows).filter((row) => row.kind !== 'text' && row.edit).map((row) => row.id);
  const navigation = useMatrixNavigation(gridRows.length, columns.length);
  const focusOf = (rowId: string, column: number) => {
    const row = gridRows.indexOf(rowId);
    return row < 0 ? undefined : navigation.focusOf(row, column);
  };
  // Whether the table is wider than its container, measured after layout and on every resize.
  const region = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = region.current;
    if (!element) return;
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const setRegion = (element: HTMLDivElement | null) => {
    region.current = element;
    if (typeof regionRef === 'function') regionRef(element);
    else if (regionRef) regionRef.current = element;
  };
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {scrollHint && overflows ? (
        <p className="flex items-center gap-1 text-caption text-ink-muted">
          <ChevronRight aria-hidden="true" className="size-3.5 stroke-[1.5]" />
          {scrollHint}
        </p>
      ) : null}
      {/* Focusable, so the keyboard can scroll it sideways. `relative`: the hidden texts of the cells are positioned
          against it, so they scroll and clip with the table instead of widening the page. */}
      <div
        ref={setRegion}
        tabIndex={0}
        aria-busy={loading || saving || undefined}
        role={loading ? 'status' : 'region'}
        aria-label={loading ? (loadingLabel ?? caption) : caption}
        className="@container relative overflow-x-auto rounded-md border border-line bg-surface"
      >
        {changedLabel ? (
          <span id={changedId} hidden>
            {changedLabel}
          </span>
        ) : null}
        {keyboardHint && gridRows.length > 0 ? (
          <span id={hintId} hidden>
            {keyboardHint}
          </span>
        ) : null}
        {/* Never narrower than a 168px first column and 104px a value column: 896px with seven columns. */}
        <table
          className="w-full table-fixed border-separate border-spacing-0"
          style={{ minWidth: `calc(var(--spacing) * ${42 + 26 * columns.length})` }}
          aria-describedby={keyboardHint && gridRows.length > 0 ? hintId : undefined}
          onKeyDown={gridRows.length > 0 ? navigation.onKeyDown : undefined}
        >
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(HEAD, LEAD, 'z-2')}>
                {leadHeader}
              </th>
              {columns.map((column) => (
                <th key={column.id} scope="col" className={cn(HEAD, COLUMN, 'px-2 text-center')}>
                  {column.label}
                  {column.note ? <Note text={column.note} className="justify-center" /> : null}
                  {column.changes ? (
                    <span className="mt-0.5 flex items-center justify-center gap-1 text-warning">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
                      {column.changes}
                    </span>
                  ) : null}
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
                      {row.note ? <Note text={row.note} /> : null}
                    </th>
                    {row.kind === 'text'
                      ? row.values.map((value, index) => (
                          <td key={columns[index]?.id ?? index} className={cn(CELL, LAST, 'text-body-small font-medium')}>
                            {value}
                          </td>
                        ))
                      : row.values.map((granted, index) => (
                          <MatrixCell
                            key={columns[index]?.id ?? index}
                            granted={granted}
                            yesLabel={yesLabel}
                            noLabel={noLabel}
                            edit={row.edit?.[index]}
                            busy={saving}
                            changedId={changedId}
                            onToggle={() => onToggle?.(row.id, columns[index]!.id)}
                            focus={focusOf(row.id, index)}
                            className={LAST}
                          />
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
