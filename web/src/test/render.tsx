import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import type { Account } from '@/features/auth/account';
import { SESSION_KEY } from '@/features/auth/api';

export const HR_ACCOUNT: Account = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'mai.tran@congty.vn',
  name: 'Trần Thị Mai',
  roles: ['HR'],
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

/** Renders routes the way the app does: query client, session, router. */
export function renderRoutes(routes: RouteObject[], { session = HR_ACCOUNT, path = '/', state }: RenderRoutesOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  if (session !== 'restore') queryClient.setQueryData(SESSION_KEY, session);
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname: path.split('?')[0]!, search: path.includes('?') ? `?${path.split('?')[1]}` : '', state }] });
  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
