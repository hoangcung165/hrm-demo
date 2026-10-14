import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const url = (part: string) => `*/api/employees/:employeeId/${part}`;
const HR: Account = {
  ...HR_ACCOUNT,
  permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'],
};
const bankData = [
  { id: 'a', bankName: 'Vietcombank', accountNumber: '1234567890', accountHolder: 'Lê Văn Hùng', defaultAccount: true, masked: false },
  { id: 'b', bankName: 'ACB', accountNumber: '••••••5678', accountHolder: 'Lê Văn Hùng', defaultAccount: false, masked: true },
];
const insuranceData = {
  socialInsuranceNumber: '0194000007', participationDate: '2021-04-15',
  healthRegistrationPlace: 'Bệnh viện Quận 7', healthInsuranceNumber: 'DN4012345678', masked: false,
};
const dependentData = [
  { id: 'child', fullName: 'Lê Thị An', relationship: 'Con', dateOfBirth: '2018-04-02', effectiveFrom: '2021-01-01', effectiveTo: null },
  { id: 'mother', fullName: 'Lê Thị Lan', relationship: 'Mẹ', dateOfBirth: '1959-10-10', effectiveFrom: '2020-01-01', effectiveTo: '2026-12-31' },
];
const bankOk = () => http.get(url('bank-accounts'), () => HttpResponse.json(bankData));
const dependentsOk = () => http.get(url('dependents'), () => HttpResponse.json(dependentData));
const insuranceOk = () => http.get(url('insurance'), () => HttpResponse.json(insuranceData));

function open(tab: 'bank' | 'dependents' | 'insurance', account = HR, handlers = [bankOk(), dependentsOk(), insuranceOk()]) {
  server.use(...handlers, employeeProfileApi().handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk());
  return renderRoutes(routes, { session: account, path: `/employees/${id}?tab=${tab}` });
}

describe('HRM-08 read-only Employee profile tabs', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows bank cards, default salary account, and reveals only an authorized full number', async () => {
    open('bank');
    const primary = await screen.findByRole('region', { name: 'Vietcombank' });
    const secondary = screen.getByRole('region', { name: 'ACB' });
    expect(within(primary).getByText('Tài khoản nhận lương')).toBeInTheDocument();
    expect(within(primary).getByText('Lê Văn Hùng')).toBeInTheDocument();
    expect(within(primary).getByText('•••• 7890')).toBeInTheDocument();
    expect(within(secondary).getByText('•••• 5678')).toBeInTheDocument();
    expect(within(secondary).queryByRole('button', { name: 'Hiện đầy đủ số' })).not.toBeInTheDocument();
    await userEvent.click(within(primary).getByRole('button', { name: 'Hiện đầy đủ số' }));
    expect(within(primary).getByText('1234567890')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Người phụ thuộc' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Ngân hàng' }));
    expect(within(await screen.findByRole('region', { name: 'Vietcombank' })).getByText('•••• 7890')).toBeInTheDocument();
  });

  it('shows two dependents with effective dates and an unlimited end date', async () => {
    open('dependents');
    const first = await screen.findByRole('region', { name: 'Lê Thị An' });
    const second = screen.getByRole('region', { name: 'Lê Thị Lan' });
    expect(within(first).getByText('Không có ngày kết thúc')).toBeInTheDocument();
    expect(within(first).getByText('01/01/2021')).toBeInTheDocument();
    expect(within(second).getByText('31/12/2026')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Sửa Lê Thị An' })).toBeInTheDocument();
  });

  it('shows BHXH and BHYT in the insurance tab, masked until disclosed', async () => {
    open('insurance');
    const card = await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' });
    expect(within(card).getByText('Bệnh viện Quận 7')).toBeInTheDocument();
    expect(within(card).getByText('15/04/2021')).toBeInTheDocument();
    expect(within(card).getByText('•••• 0007')).toBeInTheDocument();
    const reveals = within(card).getAllByRole('button', { name: 'Hiện đầy đủ số' });
    await userEvent.click(reveals[0]!);
    expect(within(card).getByText('0194000007')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Hiện đầy đủ số' }));
    expect(within(card).getByText('•••• 0007')).toBeInTheDocument();
    expect(within(card).getByText('DN4012345678')).toBeInTheDocument();
  });

  it('renders empty states for each tab when no records exist', async () => {
    open('bank', HR, [
      http.get(url('bank-accounts'), () => HttpResponse.json([])),
      http.get(url('dependents'), () => HttpResponse.json([])),
      http.get(url('insurance'), () => HttpResponse.json({
        socialInsuranceNumber: null, participationDate: null, healthRegistrationPlace: null,
        healthInsuranceNumber: null, masked: true,
      })),
    ]);
    expect(await screen.findByRole('heading', { name: 'Chưa có tài khoản ngân hàng' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Người phụ thuộc' }));
    expect(await screen.findByRole('heading', { name: 'Chưa có người phụ thuộc' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Bảo hiểm' }));
    expect(await screen.findByRole('heading', { name: 'Chưa có thông tin bảo hiểm' })).toBeInTheDocument();
  });

  it('distinguishes forbidden from service errors, and supports retry', async () => {
    const denied = http.get(url('bank-accounts'), () => problem(403, 'auth.forbidden'));
    open('bank', HR, [denied]);
    expect(await screen.findByText('Bạn không có quyền xem dữ liệu nhạy cảm')).toBeInTheDocument();
  });

  it('retrieves bank data on retry after a server error', async () => {
    let failed = true;
    const handler = http.get(url('bank-accounts'), () => failed ? problem(500, 'error.unknown') : HttpResponse.json(bankData));
    open('bank', HR, [handler]);
    expect(await screen.findByText('Không tải được thông tin Ngân hàng')).toBeInTheDocument();
    failed = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Vietcombank' })).toBeInTheDocument());
  });

  it('does not fetch other records until the tab is opened', async () => {
    let otherRequests = 0;
    open('bank', HR, [
      bankOk(),
      http.get(url('dependents'), () => { otherRequests++; return HttpResponse.json([]); }),
      http.get(url('insurance'), () => { otherRequests++; return HttpResponse.json(insuranceData); }),
    ]);
    await screen.findByRole('region', { name: 'Vietcombank' });
    expect(otherRequests).toBe(0);
    await userEvent.click(screen.getByRole('tab', { name: 'Bảo hiểm' }));
    await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' });
    expect(otherRequests).toBe(1);
  });

  it('renders the English labels and own-account masked response safely', async () => {
    await i18n.changeLanguage('en');
    const masked = http.get(url('bank-accounts'), () => HttpResponse.json([
      { ...bankData[0], accountNumber: '••••••7890', masked: true },
    ]));
    open('bank', { ...EMPLOYEE_ACCOUNT, employeeId: id }, [masked]);
    const card = await screen.findByRole('region', { name: 'Vietcombank' });
    expect(within(card).getByText('Salary account')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Show full number' })).not.toBeInTheDocument();
  });
});
