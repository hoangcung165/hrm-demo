import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { SalaryProfileSegment } from '@/features/contract/salary-profile-api';
import { initialSalaryPeriod } from '@/features/contract/salary-period';
import i18n from '@/i18n';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { catalogApi } from '@/test/catalog-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { ADMIN_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const employee = employeeId(7);
const month = initialSalaryPeriod();
const mid = month.from.slice(0, 8) + '16';
const firstEnd = month.from.slice(0, 8) + '15';
const contractId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const base: SalaryProfileSegment = {
  from: month.from, to: firstEnd,
  baseSalary: 18_000_000, insuranceSalary: 18_000_000,
  allowancesJson: '[{"name":"Ăn trưa","amount":500000}]',
  insured: true, taxMethod: 'PROGRESSIVE', overrideReason: null,
  sourceContractId: contractId, sourceAmendmentId: null,
};
const amended: SalaryProfileSegment = {
  ...base, from: mid, to: month.to, baseSalary: 21_000_000,
  sourceAmendmentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

function open({ account = ADMIN_ACCOUNT, rows = [base, amended], status = 200 }: {
  account?: Account; rows?: SalaryProfileSegment[]; status?: number;
} = {}) {
  const calls: { from: string | null; to: string | null }[] = [];
  server.use(
    http.get('*/api/employees/:employeeId/salary-profile', ({ request }) => {
      const url = new URL(request.url);
      calls.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
      return status === 200 ? HttpResponse.json(rows)
        : HttpResponse.json({ code: status === 403 ? 'auth.forbidden' : 'error.unknown' }, { status });
    }),
    http.get('*/api/employees/:employeeId/contracts', () => HttpResponse.json([])),
    employeeProfileApi().handler, employeeListApi().handler,
    ...catalogApi().handlers, orgUnitsOk(),
  );
  const view = renderRoutes(routes, { session: account, path: `/employees/${employee}?tab=salary` });
  return { ...view, calls };
}

describe('HRM-10 FE-3 salary profile and period privacy', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('renders exact 15/16-day segments, source links and masks every monetary value', async () => {
    const { calls } = open();
    expect(await screen.findByRole('heading', { name: 'Các đoạn lương trong kỳ' })).toBeInTheDocument();
    expect(calls[0]).toEqual(month);
    expect(within(screen.getByRole('list', { name: 'Thanh đoạn hiệu lực Hồ sơ lương' }))
      .getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Dòng thời gian Hồ sơ lương' })).toBeInTheDocument();
    expect(screen.queryByText('18.000.000 ₫')).not.toBeInTheDocument();
    expect(screen.queryByText('21.000.000 ₫')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /hợp đồng.*nguồn/i })[0])
      .toHaveAttribute('href', `/employees/${employee}?tab=contracts#contract-${contractId}`);
    expect(screen.queryByRole('button', { name: /^Sửa/i })).not.toBeInTheDocument();
    const toggle = screen.getAllByRole('button', { name: /^Hiện số tiền đoạn/ })[0]!;
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(screen.getAllByText('21.000.000 ₫').length).toBeGreaterThan(0);
    expect(screen.queryByText('18.000.000 ₫')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Lương và phụ cấp' }));
    await screen.findByRole('heading', { name: 'Dòng thời gian Hồ sơ lương' });
    expect(screen.queryByText('21.000.000 ₫')).not.toBeInTheDocument();
  });

  it('does not fetch sensitive records without both required permissions', async () => {
    const { calls } = open({ account: { ...ADMIN_ACCOUNT, permissions: ['EMPLOYEE_VIEW'] } });
    expect(await screen.findByText('Bạn không có quyền xem Hồ sơ lương')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('treats API 403 as denied; handles loading failures with retry', async () => {
    const denied = open({ status: 403 });
    expect(await screen.findByText('Bạn không có quyền xem Hồ sơ lương')).toBeInTheDocument();
    denied.unmount();
    const failed = open({ status: 500 });
    expect(await screen.findByText('Không thể tải Hồ sơ lương')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(failed.calls.length).toBeGreaterThan(1));
  });

  it('shows an informative empty state for a period with no effective salary', async () => {
    open({ rows: [] });
    expect(await screen.findByText('Không có Hồ sơ lương trong kỳ')).toBeInTheDocument();
  });

  it('only changes the API period after a valid submission and re-masks on range change', async () => {
    const { calls } = open();
    await screen.findByRole('heading', { name: 'Dòng thời gian Hồ sơ lương' });
    const start = screen.getByLabelText('Từ ngày');
    const end = screen.getByLabelText('Đến ngày');
    fireEvent.change(start, { target: { value: '2026-11-20' } });
    fireEvent.change(end, { target: { value: '2026-11-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Xem kỳ' }));
    expect(await screen.findByText(/ngày bắt đầu không sau ngày kết thúc/)).toBeInTheDocument();
    expect(calls).toHaveLength(1);
    fireEvent.change(start, { target: { value: '2026-10-01' } });
    fireEvent.change(end, { target: { value: '2026-10-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Xem kỳ' }));
    await waitFor(() => expect(calls.some(c => c.from === '2026-10-01' && c.to === '2026-10-31')).toBe(true));
  });
});
