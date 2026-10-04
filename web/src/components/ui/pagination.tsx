// Library component "Pagination": summary on the left, page buttons on the right.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type PaginationProps = {
  /** Zero-based current page. */
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  className?: string;
};

/** Pages to show: first, last, the current one and its neighbours; `null` marks a gap. */
function pageWindow(current: number, count: number): Array<number | null> {
  const wanted = new Set([0, count - 1, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  pages.forEach((page, i) => {
    if (i > 0 && page - pages[i - 1]! > 1) out.push(null);
    out.push(page);
  });
  return out;
}

const pageButton =
  'inline-grid h-8 min-w-8 cursor-pointer place-items-center rounded-sm px-2 tabular-nums text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent [&_svg]:size-4 [&_svg]:stroke-[1.5]';

export function Pagination({ pageIndex, pageSize, total, onPageChange, className }: PaginationProps) {
  const { t } = useTranslation();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  return (
    <nav aria-label={t('table.pagination')} className={cn('flex items-center gap-1', className)}>
      <span aria-live="polite" className="mr-auto text-[14px] text-ink-muted tabular-nums">{t('table.summary', { from, to, total })}</span>
      <button
        type="button"
        className={pageButton}
        aria-label={t('table.previousPage')}
        disabled={pageIndex === 0}
        onClick={() => onPageChange(pageIndex - 1)}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      {pageWindow(pageIndex, pageCount).map((page, i) =>
        page === null ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            aria-label={t('table.page', { page: page + 1 })}
            aria-current={page === pageIndex ? 'page' : undefined}
            className={cn(pageButton, page === pageIndex && 'bg-brand-blue font-medium text-on-brand hover:bg-brand-blue')}
            onClick={() => onPageChange(page)}
          >
            {page + 1}
          </button>
        ),
      )}
      <button
        type="button"
        className={pageButton}
        aria-label={t('table.nextPage')}
        disabled={pageIndex >= pageCount - 1}
        onClick={() => onPageChange(pageIndex + 1)}
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
