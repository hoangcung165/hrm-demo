import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/toast-provider';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import type { Account } from '@/features/auth/account';
import { SESSION_KEY } from '@/features/auth/api';

export const HR_ACCOUNT: Account = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'mai.tran@congty.vn',
  name: 'Trần Thị Mai',
  roles: ['HR'],
  dataScope: 'COMPANY',
  permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW'],
};

export const ADMIN_ACCOUNT: Account = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'admin@hrm.local',
  name: 'admin@hrm.local',
  roles: ['ADMIN'],
  dataScope: 'COMPANY',
  permissions: ['COMPANY_VIEW', 'COMPANY_EDIT', 'ACCOUNT_VIEW'],
};

export type RenderRoutesOptions = {
  /**
   * The session the app starts with: an Account (signed in, the default), `null` (signed out),
   * or `'restore'` to let the app call the refresh endpoint as it does on a page load.
   */
  session?: Account | null | 'restore';
  /** Initial URL, with an optional router state. */
  path?: string;
  state?: unknown;
};

/** Renders routes the way the app does: query client, session, toasts, router. */
export function renderRoutes(routes: RouteObject[], { session = HR_ACCOUNT, path = '/', state }: RenderRoutesOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  if (session !== 'restore') queryClient.setQueryData(SESSION_KEY, session);
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname: path.split('?')[0]!, search: path.includes('?') ? `?${path.split('?')[1]}` : '', state }] });
  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}

/** The live region that holds the Toasts; a success Toast is found in it by its text, a failure by role "alert". */
export const toastRegion = () => screen.getByRole('region', { name: /^(Thông báo kết quả thao tác|Action results)$/ });
