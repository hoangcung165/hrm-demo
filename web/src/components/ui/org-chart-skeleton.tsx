// Loading state of the library component "Org chart": Skeleton cards in the layout of the chart.
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

// The viewport of the chart: `surface-muted`. 175px is the column width the design system defines for the chart
// (`--hrm-org-col`); there is no token for it.
export const ORG_CHART_VIEWPORT = 'relative bg-surface-muted px-4 py-6 [--hrm-org-col:175px]';

const CARD = 'flex flex-col rounded-md border border-line bg-surface';
// Stacked cards under each column of the row.
const COLUMNS = [3, 0, 2, 0, 1];

function SkeletonCard({ className, name }: { className?: string; name: string }) {
  return (
    <div className={cn(CARD, className)}>
      <Skeleton shape="title" className={name} />
      <span className="flex items-center gap-2">
        <Skeleton shape="circle" className="size-6" />
        <Skeleton className="w-[55%]" />
      </span>
      <Skeleton className="w-8" />
    </div>
  );
}

export type OrgChartSkeletonProps = {
  /** Accessible name of the busy region: "Đang tải sơ đồ tổ chức". */
  label: string;
  className?: string;
};

export function OrgChartSkeleton({ label, className }: OrgChartSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn(ORG_CHART_VIEWPORT, 'overflow-hidden', className)}>
      <div className="mx-auto flex w-max flex-col items-center">
        <SkeletonCard className="w-74 gap-3 p-3" name="w-[70%]" />
        <div className="flex justify-center pt-8">
          {COLUMNS.map((stacked, column) => (
            <div key={column} className="flex w-[calc(var(--hrm-org-col)+var(--space-2))] flex-none flex-col px-1">
              <SkeletonCard className="gap-3 p-3" name="w-[80%]" />
              <div className="flex flex-col gap-2 pt-2 pl-4">
                {Array.from({ length: stacked }, (_, index) => (
                  <SkeletonCard key={index} className="gap-2 p-2" name={index % 2 ? 'w-[50%]' : 'w-[65%]'} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
