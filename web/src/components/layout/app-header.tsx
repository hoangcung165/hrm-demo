// Header of the app shell (pattern P1): company mark, search, Demo as…, language, notifications, Account menu.
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Input } from '@/components/ui/input';
import { useLogout } from '@/features/auth/api';
import { ChangePasswordDialog } from '@/features/auth/components/change-password-dialog';
import { DemoAsMenu } from '@/features/demo/components/demo-as-menu';
import { AccountMenu } from './account-menu';
import { HeaderCompanyMark } from './header-company-mark';
import { LanguageSwitch } from './language-switch';
import { MobileNavDrawer } from './mobile-nav-drawer';

export function AppHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useLogout();
  const [changingPassword, setChangingPassword] = useState(false);
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 md:h-16 md:gap-3 md:px-6">
      {/* Below md the company mark stands where the HRM lockup was; the lockup stays in the drawer header. */}
      <div className="flex md:hidden">
        <MobileNavDrawer />
      </div>
      <HeaderCompanyMark className="md:mr-1" />
      {/* Search and notifications get their behaviour in later issues (HRM-06, HRM-12). */}
      <Input
        type="search"
        aria-label={t('header.search')}
        placeholder={t('header.searchPlaceholder')}
        leading={<Search aria-hidden="true" />}
        wrapperClassName="hidden min-w-50 shrink grow-0 basis-90 md:flex"
      />
      <span className="hidden flex-1 md:block" />
      {/* Below md "Demo as…" sits in the nav drawer. Not rendered at all while the demo flag is off. */}
      <DemoAsMenu className="hidden md:inline-flex" />
      <LanguageSwitch className="hidden md:inline-flex" />
      <button
        type="button"
        aria-label={t('header.notifications')}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-ink hover:bg-surface-muted md:size-10 [&_svg]:size-5 [&_svg]:stroke-[1.5]"
      >
        <Bell aria-hidden="true" />
      </button>
      <AccountMenu
        onOpenProfile={() => navigate('/profile')}
        onChangePassword={() => setChangingPassword(true)}
        onSignOut={() => logout.mutate()}
      />
      <ChangePasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </header>
  );
}
