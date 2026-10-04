// Library component "Card" → detail list (`hrm-dl`, pattern P3): read-only label and value pairs of a record.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DetailListItem = { label: string; value: ReactNode };

export type DetailListProps = { items: DetailListItem[]; className?: string };

export function DetailList({ items, className }: DetailListProps) {
  return (
    <dl className={cn('grid grid-cols-[calc(var(--spacing)*32)_minmax(0,1fr)] gap-x-4 gap-y-3', className)}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-ink-muted">{item.label}</dt>
          <dd className="min-w-0">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
