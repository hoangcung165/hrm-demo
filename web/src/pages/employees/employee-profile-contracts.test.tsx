import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format, parseISO } from 'date-fns';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { EmploymentContract } from '@/features/contract/api';
import i18n from '@/i18n';
import { companyTodayIso } from '@/lib/company-time';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const HR: Account = { ...HR_ACCOUNT,
  permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_SENSITIVE_VIEW'] };
const today = companyTodayIso();
const inTwentyDays = format(addDays(parseISO(today), 20), 'yyyy-MM-dd');
const inSixtyDays = format(addDays(parseISO(today), 60), 'yyyy-MM-dd');

function row(number: string, startsOn: string, endsOn: string | null, salary: number): EmploymentContract {
  return {
    id: number, employeeId: id, contractNumber: number, contractType: 'FIXED_TERM',
    signedOn: '2024-01-01', startsOn, endsOn, baseSalary: salary,
    insuranceSalary: salary, allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE',
  };
}
const active = row('HD-CURRENT', '2024-01-01', inTwentyDays, 18000000);
const historical = row('HD-HISTORY', '2021-01-01', '2022-12-31', 12000000);

function open({ account = HR, rows = [active, historical], status = 200 }: {
  account?: Account; rows?: EmploymentContract[]; status?: number;
} = {}) {
  let calls = 0;
  server.use(
    http.get('*/api/employees/:employeeId/contracts/:contractId/amendments', () => HttpResponse.json([])),
    http.get('*/api/employees/:employeeId/contracts', () => {
      calls++;
      return status === 200 ? HttpResponse.json(rows)
        : HttpResponse.json({ code: status === 403 ? 'auth.forbidden' : 'error.unknown' }, { status });
    }),
    employeeProfileApi().handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk(),
  );
  const view = renderRoutes(routes, { session: account, path: `/employees/${id}?tab=contracts` });
  return { ...view, calls: () => calls };
}
const card = (number: string) => screen.getByRole('region', { name: number });
const valueOf = (scope: HTMLElement, label: string) =>
  within(scope).getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;

describe('HRM-10 FE-1: contract history and privacy', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('shows current and historical contracts with an expiry warning, and masks each card separately', async () => {
    open();
    await screen.findByRole('heading', { name: 'Hợp đồng hiện tại' });
    expect(screen.getByRole('heading', { name: 'Hợp đồng trước đây và sắp có hiệu lực' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Có hợp đồng sắp hết hạn');
    expect(within(card('HD-CURRENT')).getByText('Sắp hết hạn')).toBeInTheDocument();
    expect(within(card('HD-HISTORY')).getByText('Đã hết hạn')).toBeInTheDocument();
    expect(valueOf(card('HD-CURRENT'), 'Mức lương')).toHaveTextContent('•••••• ₫');
    expect(valueOf(card('HD-HISTORY'), 'Mức lương')).toHaveTextContent('•••••• ₫');
    await userEvent.click(within(card('HD-CURRENT')).getByRole('button', { name: 'Hiện lương hợp đồng HD-CURRENT' }));
    expect(valueOf(card('HD-CURRENT'), 'Mức lương')).toHaveTextContent('18.000.000 ₫');
    expect(valueOf(card('HD-HISTORY'), 'Mức lương')).toHaveTextContent('•••••• ₫');
    await userEvent.click(within(card('HD-CURRENT')).getByRole('button', { name: 'Ẩn lương hợp đồng HD-CURRENT' }));
    expect(valueOf(card('HD-CURRENT'), 'Mức lương')).toHaveTextContent('•••••• ₫');
  });

  it('re-masks salary after navigating away and back to the tab', async () => {
    open();
    await screen.findByRole('region', { name: 'HD-CURRENT' });
    await userEvent.click(within(card('HD-CURRENT')).getByRole('button', { name: 'Hiện lương hợp đồng HD-CURRENT' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Hợp đồng' }));
    await waitFor(() => expect(valueOf(card('HD-CURRENT'), 'Mức lương')).toHaveTextContent('•••••• ₫'));
  });

  it('does not request the sensitive endpoint when permission is missing', async () => {
    const { calls } = open({ account: { ...HR, permissions: ['EMPLOYEE_VIEW'] } });
    expect(await screen.findByText('Bạn không có quyền xem hợp đồng')).toBeInTheDocument();
    expect(calls()).toBe(0);
    expect(screen.queryByText('18.000.000 ₫')).not.toBeInTheDocument();
  });

  it('shows denied for a backend 403, and an actionable retry for 500', async () => {
    const denied = open({ status: 403 });
    expect(await screen.findByText('Bạn không có quyền xem hợp đồng')).toBeInTheDocument();
    denied.unmount();
    const error = open({ status: 500 });
    expect(await screen.findByText('Không tải được danh sách hợp đồng')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(error.calls()).toBeGreaterThan(1));
  });

  it('shows an informative empty state without edit actions', async () => {
    open({ rows: [] });
    expect(await screen.findByText('Chưa có hợp đồng lao động')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm hợp đồng/i })).not.toBeInTheDocument();
  });

  it('labels contracts with future start dates as upcoming', async () => {
    open({ rows: [row('HD-FUTURE', inSixtyDays, null, 21000000)] });
    await screen.findByRole('region', { name: 'HD-FUTURE' });
    expect(within(card('HD-FUTURE')).getByText('Chưa có hiệu lực')).toBeInTheDocument();
  });
  it('shows the create action only to authorized editors and updates the list after saving', async () => {
    const rows: EmploymentContract[] = [];
    let posted: Record<string, unknown> | null = null;
    open({ rows });
    server.use(http.post('*/api/employees/:employeeId/contracts', async ({ request }) => {
      posted = await request.json() as Record<string, unknown>;
      rows.push(row('HD-NEW', '2026-01-01', '2026-12-31', 20_000_000));
      return HttpResponse.json(rows[0], { status: 201 });
    }));
    await screen.findByText('Chưa có hợp đồng lao động');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm hợp đồng' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    await userEvent.type(within(dialog).getByLabelText('Số hợp đồng'), 'HD-NEW');
    await userEvent.type(within(dialog).getByLabelText('Ngày ký'), '2026-01-01');
    await userEvent.type(within(dialog).getByLabelText('Ngày bắt đầu'), '2026-01-01');
    await userEvent.type(within(dialog).getByLabelText('Lương theo hợp đồng (VND)'), '20000000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu hợp đồng' }));
    expect(await screen.findByRole('region', { name: 'HD-NEW' })).toBeInTheDocument();
    expect(posted).toMatchObject({ contractNumber: 'HD-NEW', baseSalary: 20000000, insured: true, taxMethod: 'PROGRESSIVE' });
    expect(valueOf(card('HD-NEW'), 'Mức lương')).toHaveTextContent('•••••• ₫');
  });

  it('does not render write controls without EMPLOYEE_EDIT', async () => {
    open({ account: { ...HR, permissions: ['EMPLOYEE_VIEW', 'EMPLOYEE_SENSITIVE_VIEW'] } });
    await screen.findByRole('region', { name: 'HD-CURRENT' });
    expect(screen.queryByRole('button', { name: 'Thêm hợp đồng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm phụ lục' })).not.toBeInTheDocument();
  });

  it('handles immutable-source deletion refusal without removing contract', async () => {
    open();
    server.use(http.delete('*/api/employees/:employeeId/contracts/:contractId', () =>
      HttpResponse.json({ code: 'contract.salary_source_locked' }, { status: 409 })));
    await screen.findByRole('region', { name: 'HD-CURRENT' });
    await userEvent.click(within(card('HD-CURRENT')).getByRole('button', { name: 'Xóa hợp đồng HD-CURRENT' }));
    const dialog = screen.getByRole('dialog', { name: 'Xóa hợp đồng HD-CURRENT' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xóa' }));
    expect(await screen.findByText(/Không thể xóa: hợp đồng là nguồn hồ sơ lương/)).toBeInTheDocument();
    expect(card('HD-CURRENT')).toBeInTheDocument();
  });

});
