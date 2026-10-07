// Library component "Table", compact rows (`hrm-rows`, below 768px): the same records as a two-line list.
// Line one is the lead (a Person) and the row action; line two the row's Badges, with the status pushed to the right.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { rowClicked } from './row-clicked';
import { Skeleton } from './skeleton';

export type DataRowsLayout<T> = {
  /** Line one: a Person with Avatar 32, the name in `body-strong` and a caption. */
  lead: (row: T) => ReactNode;
  /** Line two: the row's Badges; they wrap. */
  meta: (row: T) => ReactNode;
  /** What the Badges are, read out before them in place of the column header a table has: "Vai trò". Not shown. */
  metaLabel?: string;
  /** Line two, pushed to the right: the status Badge. */
  end?: (row: T) => ReactNode;
  /** What `end` is, read out before it: "Trạng thái". Not shown. */
  endLabel?: string;
  /** Line one, right: a 44px icon button. */
  action?: (row: T) => ReactNode;
};

export type DataRowsProps<T> = DataRowsLayout<T> & {
  /** Accessible name of the list, e.g. "Danh sách tài khoản". */
  label: string;
  data: T[];
  rowKey: (row: T) => string;
  /** Skeleton rows instead of the data. */
  loadingRows?: number;
  /** The whole row opens the record; the lead still holds the link to it (see `DataTable`). */
  onRowClick?: (row: T) => void;
  className?: string;
};

// Clips the hover fill of a clickable row to the rounded corners.
const LIST = 'overflow-hidden rounded-md border border-line bg-surface';
const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b border-line pt-2 pr-2 pb-3 pl-4 last:border-b-0';

export function DataRows<T>({ label, data, rowKey, lead, meta, metaLabel, end, endLabel, action, loadingRows = 0, onRowClick, className }: DataRowsProps<T>) {
  if (loadingRows > 0) {
    return (
      <div role="status" aria-busy="true" aria-label={label} className={cn(LIST, className)}>
        {Array.from({ length: loadingRows }, (_, index) => (
          <div key={index} className={cn(ROW, 'last:border-b-0')}>
            <span className="col-span-full flex min-h-11 items-center gap-3">
              <Skeleton shape="circle" />
              <span className="flex flex-1 flex-col gap-2">
                <Skeleton className={index % 2 ? 'w-[52%]' : 'w-[44%]'} />
                <Skeleton className={index % 2 ? 'w-[60%]' : 'w-[68%]'} />
              </span>
            </span>
            <span className="col-span-full flex h-6 items-center justify-between pr-2">
              <Skeleton className="w-20" />
              <Skeleton className="w-24" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ul aria-label={label} className={cn(LIST, className)}>
      {data.map((row) => {
        const button = action?.(row);
        return (
          <li
            key={rowKey(row)}
            onClick={onRowClick ? (event) => rowClicked(event, () => onRowClick(row)) : undefined}
            className={cn(ROW, onRowClick && 'cursor-pointer hover:bg-surface-muted')}
          >
            {/* Without an action the lead keeps the 44px line of the button, so rows have one height. */}
            <span className={cn('flex min-h-11 min-w-0 items-center', !button && 'col-span-full')}>{lead(row)}</span>
            {button}
            <span className="col-span-full flex flex-wrap items-center gap-1 pr-2">
              {metaLabel ? <span className="sr-only">{metaLabel}: </span> : null}
              {meta(row)}
              {end ? (
                <span className="ml-auto">
                  {endLabel ? <span className="sr-only">{endLabel}: </span> : null}
                  {end(row)}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
