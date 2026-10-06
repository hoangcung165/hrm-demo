// Auth API calls and the session query. Contracts: "## API contract" comments on issues #44 and #45.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, isAccountLocked, refreshAccessToken, setAccessToken, type SessionEndReason } from '@/lib/api';
import type { Account } from './account';

type AccessTokenResponse = { accessToken: string };

export const SESSION_KEY = ['session'] as const;
const NOTICE_KEY = ['session', 'notice'] as const;

/** One-off message for the login page, set by flows that end there (password reset or change). */
export type LoginNotice = 'passwordSaved' | 'accountLocked';

function fetchAccount(): Promise<Account> {
  return api<Account>('/api/me');
}

/**
 * On page load: try the refresh cookie. No cookie or an expired one means signed out, not an error.
 * When the backend says the Account is locked, the login page will say so.
 */
async function restoreSession(queryClient: QueryClient): Promise<Account | null> {
  try {
    await refreshAccessToken();
    return await fetchAccount();
  } catch (error) {
    if (isAccountLocked(error)) setLoginNotice(queryClient, 'accountLocked');
    return null;
  }
}

/** The signed-in Account, `null` when signed out, `undefined` while the session is being restored. */
export function useSession() {
  const queryClient = useQueryClient();
  return useQuery({ queryKey: SESSION_KEY, queryFn: () => restoreSession(queryClient), staleTime: Infinity, gcTime: Infinity, retry: false });
}

/** The pending login-page notice, if any. Kept in the query cache so it survives the redirect to /login. */
export function useLoginNotice(): LoginNotice | null {
  return useQuery({ queryKey: NOTICE_KEY, queryFn: () => null, staleTime: Infinity, enabled: false }).data ?? null;
}

export function setLoginNotice(queryClient: QueryClient, notice: LoginNotice | null) {
  queryClient.setQueryData<LoginNotice | null>(NOTICE_KEY, notice);
}

/** Ends the session locally; the route guard then goes to the login page, which names the reason when there is one. */
export function clearSession(queryClient: QueryClient, reason?: SessionEndReason) {
  if (reason === 'locked') setLoginNotice(queryClient, 'accountLocked');
  setAccessToken(null);
  queryClient.setQueryData(SESSION_KEY, null);
}

/** Reads GET /api/me again, e.g. after the Account edited itself: the header name and the permissions follow. */
export function useRefreshAccount() {
  const queryClient = useQueryClient();
  return async () => queryClient.setQueryData(SESSION_KEY, await fetchAccount());
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
