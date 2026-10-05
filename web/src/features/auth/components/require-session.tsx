// Route guard: restores the session on load, sends signed-out visitors to the login page.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Loading } from '@/components/ui/loading';
import { setSessionExpiredHandler } from '@/lib/api';
import { AccountContext } from '../account-context';
import { clearSession, useRefreshAccount, useSession } from '../api';

const RECHECK_MS = 60_000;

export function RequireSession() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const session = useSession();

  // When a refresh fails mid-session the API layer reports it here, and the guard below redirects.
  useEffect(() => {
    setSessionExpiredHandler((reason) => clearSession(queryClient, reason));
    return () => setSessionExpiredHandler(() => {});
  }, [queryClient]);

  // Coming back to the tab reads GET /api/me again (at most once a minute): roles changed meanwhile apply, and an
  // Account locked meanwhile learns of it here instead of working on until its access token runs out.
  const refreshAccount = useRefreshAccount();
  const signedIn = Boolean(session.data);
  useEffect(() => {
    if (!signedIn) return;
    let checkedAt = 0;
    const check = () => {
      if (document.visibilityState !== 'visible' || Date.now() - checkedAt < RECHECK_MS) return;
      checkedAt = Date.now();
      // A failure that ends the session is handled by the API layer; any other leaves the session as it is.
      void refreshAccount().catch(() => {});
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
    // `refreshAccount` is new on every render.
  }, [signedIn]);

  if (session.isPending) {
    return (
      <div className="mx-auto max-w-[400px] p-8">
        <Loading />
      </div>
    );
  }
  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <AccountContext.Provider value={session.data}>
      <Outlet />
    </AccountContext.Provider>
  );
}
