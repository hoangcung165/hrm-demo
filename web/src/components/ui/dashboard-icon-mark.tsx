// The lead of a Dashboard widget row for a thing rather than a person (a contract, a probation end, a certificate):
// a 32px circle on surface-muted with a 16px icon in ink-muted. Decorative; the row's text says what it is.
import type { ReactNode } from 'react';

export function DashboardIconMark({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted [&_svg]:size-4 [&_svg]:stroke-[1.5]">
      {children}
    </span>
  );
}
