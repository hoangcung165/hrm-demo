// Library component "Pagination": summary on the left, page buttons on the right.
// `compact` (below 768px, under compact rows): the summary plus previous / next, 44px.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type PaginationProps = {
  /** Zero-based current page. */
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  /** The summary with the record type: "Hiển thị 21–40 trên 712 nhân viên". Without it: "21–40 trong 712". */
  summary?: (range: { from: number; to: number; total: number }) => string;
  variant?: 'default' | 'compact';
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

export function Pagination({ pageIndex, pageSize, total, onPageChange, summary, variant = 'default', className }: PaginationProps) {
  const { t } = useTranslation();
  const compact = variant === 'compact';
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const range = { from: total === 0 ? 0 : pageIndex * pageSize + 1, to: Math.min(total, (pageIndex + 1) * pageSize), total };
  const first = pageIndex === 0;
  const last = pageIndex >= pageCount - 1;
  // 14px is the design system's size for the summary; there is no text token for it.
  const text = (
    <span aria-live="polite" className={cn('text-[14px] text-ink-muted tabular-nums', compact ? 'min-w-0 flex-1' : 'mr-auto')}>
      {summary ? summary(range) : t('table.summary', range)}
    </span>
  );
  if (compact) {
    return (
      <nav aria-label={t('table.pagination')} className={cn('flex items-center gap-2', className)}>
        {text}
        <Button variant="secondary" size="icon" className="size-11" aria-label={t('table.previousPage')} disabled={first} onClick={() => onPageChange(pageIndex - 1)}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button variant="secondary" size="icon" className="size-11" aria-label={t('table.nextPage')} disabled={last} onClick={() => onPageChange(pageIndex + 1)}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    );
  }
  return (
    <nav aria-label={t('table.pagination')} className={cn('flex items-center gap-1', className)}>
      {text}
      <button type="button" className={pageButton} aria-label={t('table.previousPage')} disabled={first} onClick={() => onPageChange(pageIndex - 1)}>
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
      <button type="button" className={pageButton} aria-label={t('table.nextPage')} disabled={last} onClick={() => onPageChange(pageIndex + 1)}>
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
