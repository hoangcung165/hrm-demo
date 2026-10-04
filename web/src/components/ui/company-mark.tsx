// Library component "Company mark": the customer company (logo and name) in the app shell header.
// Not a link and not a button: there is no company to switch to.
import { Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export type CompanyMarkProps = {
  /** Company name; without it (the company could not be loaded) only the fallback tile shows. */
  name?: string;
  logoUrl?: string | null;
  /** False between 768 and 1279px: the tile alone, which then carries the name as its accessible name. */
  showName?: boolean;
  loading?: boolean;
  /** Accessible label of the loading state ("Đang tải"). */
  loadingLabel?: string;
  className?: string;
};

// Never narrower than its tile, at most 320px.
const mark = 'inline-flex max-w-80 min-w-8 items-center gap-2 text-ink';

export function CompanyMark({ name, logoUrl, showName = true, loading = false, loadingLabel, className }: CompanyMarkProps) {
  if (loading) {
    return (
      <span role="status" aria-busy="true" aria-label={loadingLabel} className={cn(mark, className)}>
        <Skeleton className="size-8 shrink-0" />
        {showName ? <Skeleton className="w-30" /> : null}
      </span>
    );
  }
  // With the name next to it the tile is decorative; alone it names the company.
  const tileName = showName ? undefined : name;
  return (
    <span title={name} className={cn(mark, className)}>
      {logoUrl ? (
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-sm border border-line bg-surface">
          <img src={logoUrl} alt={tileName ?? ''} className="size-full object-contain" />
        </span>
      ) : (
        <span
          role={tileName ? 'img' : undefined}
          aria-label={tileName}
          aria-hidden={tileName ? undefined : true}
          className="grid size-8 shrink-0 place-items-center rounded-sm bg-brand-blue-soft text-brand-blue"
        >
          <Building aria-hidden="true" className="size-5 stroke-[1.5]" />
        </span>
      )}
      {showName && name ? <span className="min-w-0 truncate text-body-strong">{name}</span> : null}
    </span>
  );
}
