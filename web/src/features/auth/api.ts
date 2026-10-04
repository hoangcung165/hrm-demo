// Auth API calls and the session query. Contracts: "## API contract" comments on issues #44 and #45.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, refreshAccessToken, setAccessToken } from '@/lib/api';
import type { Account, Role } from './account';

type MeResponse = { id: string; email: string; roles: Role[] };
type AccessTokenResponse = { accessToken: string };

export const SESSION_KEY = ['session'] as const;
const NOTICE_KEY = ['session', 'notice'] as const;

/** One-off message for the login page, set by flows that end there (password reset or change). */
export type LoginNotice = 'passwordSaved';

async function fetchAccount(): Promise<Account> {
  const me = await api<MeResponse>('/api/me');
  // Accounts have no display name until they are linked to Employees (HRM-06).
  return { ...me, name: me.email };
}

/** On page load: try the refresh cookie. No cookie or an expired one means signed out, not an error. */
async function restoreSession(): Promise<Account | null> {
  try {
    await refreshAccessToken();
    return await fetchAccount();
  } catch {
    return null;
  }
}

/** The signed-in Account, `null` when signed out, `undefined` while the session is being restored. */
export function useSession() {
  return useQuery({ queryKey: SESSION_KEY, queryFn: restoreSession, staleTime: Infinity, gcTime: Infinity, retry: false });
}

/** The pending login-page notice, if any. Kept in the query cache so it survives the redirect to /login. */
export function useLoginNotice(): LoginNotice | null {
  return useQuery({ queryKey: NOTICE_KEY, queryFn: () => null, staleTime: Infinity, enabled: false }).data ?? null;
}

export function setLoginNotice(queryClient: QueryClient, notice: LoginNotice | null) {
  queryClient.setQueryData<LoginNotice | null>(NOTICE_KEY, notice);
}

export function clearSession(queryClient: QueryClient) {
  setAccessToken(null);
  queryClient.setQueryData(SESSION_KEY, null);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const tokens = await api<AccessTokenResponse>('/api/auth/login', { method: 'POST', body: credentials, auth: false });
      setAccessToken(tokens.accessToken);
      return fetchAccount();
    },
    onSuccess: (account) => {
      setLoginNotice(queryClient, null);
      queryClient.setQueryData(SESSION_KEY, account);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api('/api/auth/logout', { method: 'POST', auth: false }),
    // Sign out locally even when the request fails: the user asked to leave.
    onSettled: () => clearSession(queryClient),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email, language }: { email: string; language: string }) =>
      api('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false, headers: { 'Accept-Language': language } }),
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { token: string; newPassword: string }) =>
      api('/api/auth/reset-password', { method: 'POST', body, auth: false }),
    onSuccess: () => setLoginNotice(queryClient, 'passwordSaved'),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api('/api/auth/change-password', { method: 'POST', body }),
    // The backend revokes every refresh token of the Account, this session included:
    // clearing the session makes the route guard send the user to the login page.
    onSuccess: () => {
      setLoginNotice(queryClient, 'passwordSaved');
      clearSession(queryClient);
    },
  });
}
