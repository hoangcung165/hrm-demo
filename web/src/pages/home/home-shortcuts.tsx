import { CalendarPlus, ClipboardList, UserRound, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

const SHORTCUTS: Array<{ key: 'create' | 'profile' | 'requests'; to: string; icon: LucideIcon }> = [
  { key: 'create', to: '/leave/new', icon: CalendarPlus },
  { key: 'profile', to: '/profile', icon: UserRound },
  { key: 'requests', to: '/leave', icon: ClipboardList },
];

export type HomeShortcutsProps = { className?: string };

/** Three links to what an Employee does most: send a leave request, open their profile, see their requests. */
export function HomeShortcuts({ className }: HomeShortcutsProps) {
  const { t } = useTranslation();
  return (
    <ul aria-label={t('dashboard.employee.shortcuts.label')} className={cn('grid grid-cols-3 gap-2 md:gap-4', className)}>
      {SHORTCUTS.map(({ key, to, icon: Icon }) => (
        <li key={key} className="contents">
          <Link
            to={to}
            className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-md border border-line bg-surface p-3 text-center text-body-small font-medium text-ink no-underline hover:bg-surface-muted focus-visible:shadow-focus-ring"
          >
            <Icon aria-hidden="true" className="size-5 stroke-[1.5] text-brand-blue" />
            {t(`dashboard.employee.shortcuts.${key}`)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
