// Library component "Sidebar nav": primary navigation of the app shell, filtered by the Account's roles.
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useCurrentAccount } from '@/features/auth/account-context';
import { cn } from '@/lib/utils';
import { visibleNavGroups } from './nav-items';

export type SidebarNavProps = {
  /** Called after a link is chosen, e.g. to close the mobile drawer. */
  onNavigate?: () => void;
  /** 44px rows for touch (mobile drawer); 40px otherwise. */
  touch?: boolean;
  className?: string;
};

export function SidebarNav({ onNavigate, touch = false, className }: SidebarNavProps) {
  const { t } = useTranslation();
  const { roles } = useCurrentAccount();
  return (
    <nav aria-label={t('nav.label')} className={cn('flex flex-col gap-0.5 p-3', className)}>
      {visibleNavGroups(roles).map((group) => (
        <div key={group.id} role="group" aria-label={group.labelKey ? t(group.labelKey) : undefined} className="flex flex-col gap-0.5">
          {group.labelKey ? (
            <span aria-hidden="true" className="mx-3 mt-3 mb-1 text-caption text-ink-muted">
              {t(group.labelKey)}
            </span>
          ) : null}
          {group.items.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-3 rounded-sm px-3 text-ink hover:bg-surface-muted',
                  touch ? 'h-11' : 'h-10',
                  '[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:text-ink-muted',
                  isActive && 'bg-brand-blue-soft font-medium text-brand-blue hover:bg-brand-blue-soft [&_svg]:text-brand-blue',
                )
              }
            >
              <item.icon aria-hidden="true" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
