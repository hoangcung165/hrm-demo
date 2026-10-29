// Library component "Dashboard widget": one block of the Tổng quan page, a Card whose head has the title, the total
// count and a ghost link to the full list already filtered to what the block shows. Loading, empty and error keep the
// head, so each block fails and fills on its own.
import { ArrowRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';
import { StateBlock } from './state-block';

export type DashboardWidgetProps = {
  title: string;
  /** The total, not the number of rows shown ("Sắp hết hạn 12" with 5 rows). Hidden while loading, empty or failed. */
  count?: number;
  /** The list screen, already filtered to this block. A generic label ("Xem tất cả") needs `ariaLabel`. */
  link?: { label: string; to: string; ariaLabel?: string };
  /** One line under the title. */
  description?: string;
  loading?: boolean;
  /** What failed, with its object ("Không tải được danh sách sắp hết hạn"), and the retry. */
  error?: { title: string; onRetry: () => void };
  /** Shown instead of the body when there is nothing to list. */
  empty?: { icon: ReactNode; title: string; text: string };
  /** The body: a list, a chart or Approval rows. */
  children?: ReactNode;
  className?: string;
};

function Rows() {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex min-h-14 items-center gap-3 border-b border-line py-2 last:border-b-0">
          <Skeleton shape="circle" />
          <span className="flex flex-1 flex-col gap-2">
            <Skeleton className="w-2/5" />
            <Skeleton className="w-3/5" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardWidget({ title, count, link, description, loading = false, error, empty, children, className }: DashboardWidgetProps) {
  const titleId = useId();
  const failed = !loading && error;
  const showCount = !loading && !failed && !empty && count !== undefined;
  const showLink = link && !loading && !failed;
  return (
    <section aria-labelledby={titleId} aria-busy={loading || undefined} className={cn('rounded-md border border-line bg-surface px-4 md:px-6', className)}>
      <header className="pt-4">
        <div className="flex min-h-8 items-center gap-2">
          <h2 id={titleId} className="text-heading">{title}</h2>
          {showCount ? <span className="text-body-small font-medium tabular-nums text-ink-muted">{count}</span> : null}
          {showLink ? (
            <Link to={link.to} aria-label={link.ariaLabel} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'ml-auto max-md:h-11 [&_svg]:size-4')}>
              {link.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {description ? <p className="text-body-small text-ink-muted">{description}</p> : null}
      </header>
      <div className="pt-2 pb-4">
        {loading ? <Rows /> : failed ? <ErrorState title={error.title} onRetry={error.onRetry} /> : empty ? <StateBlock variant="empty" icon={empty.icon} title={empty.title} description={empty.text} /> : children}
      </div>
    </section>
  );
}
