import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { AccountProvider } from '@/features/auth/account-provider';
import { HomePage } from '@/pages/home/home-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <RouterProvider router={router} />
      </AccountProvider>
    </QueryClientProvider>
  );
}
