import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { RequireSession } from '@/features/auth/components/require-session';
import { AccountsPage } from '@/pages/accounts/accounts-page';
import { ApprovalFlowsPage } from '@/pages/approval-flows/approval-flows-page';
import { ApprovalRequestPage } from '@/pages/approvals/approval-request-page';
import { ApprovalsPage } from '@/pages/approvals/approvals-page';
import { AuditLogPage } from '@/pages/audit-log/audit-log-page';
import { CatalogsPage } from '@/pages/catalogs/catalogs-page';
import { CompanyPage } from '@/pages/company/company-page';
import { ContractTemplatesPage } from '@/pages/contract-templates/contract-templates-page';
import { EmployeeCreatePage } from '@/pages/employees/employee-create-page';
import { EmployeeImportPage } from '@/pages/employees/employee-import-page';
import { EmployeeProfilePage } from '@/pages/employees/employee-profile-page';
import { EmployeesPage } from '@/pages/employees/employees-page';
import { ForgotPasswordPage } from '@/pages/forgot-password/forgot-password-page';
import { HomePage } from '@/pages/home/home-page';
import { LeaveCreatePage } from '@/pages/leave/leave-create-page';
import { LeaveEditPage } from '@/pages/leave/leave-edit-page';
import { LeaveCalendarPage } from '@/pages/leave-calendar/leave-calendar-page';
import { LeavePage } from '@/pages/leave/leave-page';
import { LeaveRequestPage } from '@/pages/leave/leave-request-page';
import { LeavePoliciesPage } from '@/pages/leave-policies/leave-policies-page';
import { LoginPage } from '@/pages/login/login-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { OrgPage } from '@/pages/org/org-page';
import { ProjectDetailPage } from '@/pages/projects/project-detail-page';
import { ProjectsPage } from '@/pages/projects/projects-page';
import { ResourcesPage } from '@/pages/resources/resources-page';
import { MyProfilePage } from '@/pages/profile/my-profile-page';
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
          { path: 'accounts', element: <AccountsPage /> },
          { path: 'approval-flows', element: <ApprovalFlowsPage /> },
          { path: 'approvals', element: <ApprovalsPage /> },
          { path: 'approvals/:id', element: <ApprovalRequestPage /> },
          { path: 'audit-log', element: <AuditLogPage /> },
          { path: 'catalogs', element: <CatalogsPage /> },
          { path: 'company', element: <CompanyPage /> },
          { path: 'contract-templates', element: <ContractTemplatesPage /> },
          { path: 'employees', element: <EmployeesPage /> },
          { path: 'employees/new', element: <EmployeeCreatePage /> },
          { path: 'employees/import', element: <EmployeeImportPage /> },
          { path: 'employees/:id', element: <EmployeeProfilePage /> },
          { path: 'leave', element: <LeavePage /> },
          { path: 'leave/new', element: <LeaveCreatePage /> },
          { path: 'leave-calendar', element: <LeaveCalendarPage /> },
          { path: 'leave/requests/:id', element: <LeaveRequestPage /> },
          { path: 'leave/requests/:id/edit', element: <LeaveEditPage /> },
          { path: 'leave-policies', element: <LeavePoliciesPage /> },
          { path: 'org', element: <OrgPage /> },
          { path: 'profile', element: <MyProfilePage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:id', element: <ProjectDetailPage /> },
          { path: 'resources', element: <ResourcesPage /> },
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
