import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import type { Account } from '@/features/auth/account';
import { AccountProvider } from '@/features/auth/account-provider';

export const HR_ACCOUNT: Account = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'mai.tran@congty.vn',
  name: 'Trần Thị Mai',
  roles: ['HR'],
};

/** Renders routes with an Account, as the app does. */
export function renderRoutes(routes: RouteObject[], options: { account?: Account; path?: string } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [options.path ?? '/'] });
  return render(
    <AccountProvider account={options.account ?? HR_ACCOUNT}>
      <RouterProvider router={router} />
    </AccountProvider>,
  );
}

/** Renders one element inside a router (for components that use links). */
export function renderInRouter(element: ReactNode, options: { account?: Account } = {}) {
  return renderRoutes([{ path: '*', element }], options);
}
