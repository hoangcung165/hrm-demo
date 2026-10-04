// App shell (pattern P1): sidebar from md up, header, and the routed page. Below md the sidebar is a drawer.
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { AppHeader } from './app-header';
import { LogoLink } from './logo-link';
import { SidebarNav } from './sidebar-nav';

export function AppShell() {
  const { t } = useTranslation();
  return (
    <div className="flex h-dvh bg-surface-muted text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-medium focus:text-link"
      >
        {t('app.skipToContent')}
      </a>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-line px-6">
          <LogoLink />
        </div>
        <SidebarNav className="min-h-0 flex-1 overflow-y-auto" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4 outline-none focus-visible:shadow-none md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
