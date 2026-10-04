import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { RequireSession } from '@/features/auth/components/require-session';
import { CompanyPage } from '@/pages/company/company-page';
import { ForgotPasswordPage } from '@/pages/forgot-password/forgot-password-page';
import { HomePage } from '@/pages/home/home-page';
import { LoginPage } from '@/pages/login/login-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { OrgPage } from '@/pages/org/org-page';
import { ResetPasswordPage } from '@/pages/reset-password/reset-password-page';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireSession />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'company', element: <CompanyPage /> },
          { path: 'org', element: <OrgPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
