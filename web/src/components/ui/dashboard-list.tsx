// Library component "Dashboard widget" list (`hrm-widget-list`): the body of a block that lists people or things.
// Rows are at least 56px high with a line between them; at most 5 rows, the rest is what the block's link is for.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DashboardListProps = {
  /** Names the list for assistive technology; usually the block's title. */
  label: string;
  children: ReactNode;
  className?: string;
};

export function DashboardList({ label, children, className }: DashboardListProps) {
  return (
    <ul aria-label={label} className={cn('m-0 flex list-none flex-col p-0', className)}>
      {children}
    </ul>
  );
}
