// Library component "Profile header" (pattern P3): the Card on top of a record's page, with an Avatar lg, the name
// as the page's h1, a status Badge, a caption line, a row of facts under a divider and an actions slot.
// Below 768px the Badge goes under the caption and the facts are left out, as on the 390 artboard.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';

export type ProfileFact = { label: string; value: ReactNode };

export type ProfileHeaderProps = {
  name: string;
  /** The status Badge. */
  badge?: ReactNode;
  /** One line under the name, e.g. "NV00042 · Chuyên viên · Nhóm Mobile". */
  caption: string;
  /** Up to four label and value pairs. */
  facts?: ProfileFact[];
  /** Buttons on the right of the name, e.g. "Nghỉ việc". */
  actions?: ReactNode;
  className?: string;
};

export function ProfileHeader({ name, badge, caption, facts = [], actions, className }: ProfileHeaderProps) {
  return (
    <section aria-label={name} className={cn('rounded-md border border-line bg-surface', className)}>
      <div className="flex items-center gap-4 p-4 md:p-6">
        <Avatar name={name} size="lg" />
        {/* One Badge: beside the name from 768px, under the caption below (CSS order, not a second copy). */}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-3">
          <h1 className="min-w-0 text-title [overflow-wrap:anywhere]">{name}</h1>
          {badge ? <span className="order-3 md:order-none">{badge}</span> : null}
          <span className="order-2 text-ink-muted tabular-nums max-md:text-caption md:order-none md:basis-full">{caption}</span>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {facts.length > 0 ? (
        <dl className="hidden grid-cols-4 gap-6 border-t border-line px-6 py-4 md:grid">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-caption text-ink-muted">{fact.label}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
