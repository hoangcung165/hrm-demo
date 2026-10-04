// Route guard: restores the session on load, sends signed-out visitors to the login page.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Loading } from '@/components/ui/loading';
import { setSessionExpiredHandler } from '@/lib/api';
import { AccountContext } from '../account-context';
import { clearSession, useSession } from '../api';

export function RequireSession() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const session = useSession();

  // When a refresh fails mid-session the API layer reports it here, and the guard below redirects.
  useEffect(() => {
    setSessionExpiredHandler(() => clearSession(queryClient));
    return () => setSessionExpiredHandler(() => {});
  }, [queryClient]);

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
