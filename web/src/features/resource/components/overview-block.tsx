// One block of the Tổng quan tab: a titled Card that shows its own skeleton while it loads and its own error with a
// retry when its data could not be loaded, so the blocks around it keep what they show.
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export type OverviewBlockProps = {
  title: string;
  description?: string;
  /** Beside the title: a link or a toggle. */
  aside?: ReactNode;
  loading: boolean;
  error: boolean;
  /** "Không tải được Nhân sự theo dự án". */
  errorTitle: string;
  onRetry: () => void;
  loadingLabel: string;
  children: ReactNode;
  className?: string;
};

export function OverviewBlock({ title, description, aside, loading, error, errorTitle, onRetry, loadingLabel, children, className }: OverviewBlockProps) {
  return (
    <Card title={title} titleAside={aside} description={description} busy={loading} label={loadingLabel} className={className}>
      {error ? (
        <ErrorState title={errorTitle} onRetry={onRetry} />
      ) : loading ? (
        <div role="status" aria-label={loadingLabel} className="flex flex-col gap-3">
          <Skeleton className="w-full" />
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2" />
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
