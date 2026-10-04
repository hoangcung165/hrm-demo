// Page frame of the signed-out screens (pattern P4): one card centred on surface-muted, language switch below.
import { Navigate, Outlet, useLocation } from 'react-router';
import { LanguageSwitch } from '@/components/layout/language-switch';
import { Loading } from '@/components/ui/loading';
import { useSession } from '../api';

export function AuthLayout() {
  const session = useSession();
  // Where the route guard found the visitor before sending them here; signing in goes back there.
  const from = (useLocation().state as { from?: string } | null)?.from;
  if (session.data) return <Navigate to={from ?? '/'} replace />;
  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 bg-surface-muted px-4 py-12 text-ink md:py-[120px]">
      <div className="flex w-full max-w-[400px] flex-col gap-6 rounded-lg border border-line bg-surface p-6 shadow-sm md:p-8">
        {session.isPending ? <Loading /> : <Outlet />}
      </div>
      <LanguageSwitch />
    </main>
  );
}
