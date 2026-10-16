import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { AN_ID, balancesOf, YEAR } from '@/test/leave-fixtures';
import { leaveApi, type LeaveApiOptions } from '@/test/leave-handlers';
import { ADMIN_ACCOUNT, EMPLOYEE_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const AN: Account = { ...EMPLOYEE_ACCOUNT, employeeId: AN_ID };

const open = (options: LeaveApiOptions = {}, session: Account = AN) => {
  const api = leaveApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: '/leave' }) };
};

describe('LeavePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the Phép năm balance card, the other types and my requests', async () => {
    open();
    const card = await screen.findByRole('region', { name: `Phép năm ${YEAR}` });
    expect(within(card).getByText('4,5')).toBeInTheDocument();
    expect(within(card).getByText('ngày còn lại')).toBeInTheDocument();
    expect(within(card).getByText('Định mức 12 ngày · cộng dồn mỗi tháng')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: `Phép năm ${YEAR}: đã dùng 4, đang chờ 1,5, còn lại 4,5, có thể ứng thêm 2 ngày` })).toBeInTheDocument();
    const sick = screen.getByRole('region', { name: 'Nghỉ ốm' });
    expect(within(sick).getByText('BHXH chi trả · Cần đính kèm giấy tờ')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Việc riêng có lương' })).getByText('Công ty trả lương · Tối đa 3 ngày mỗi đơn')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: `Đơn nghỉ của tôi năm ${YEAR}` });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByRole('link', { name: 'Phép năm' })).toHaveAttribute('href', expect.stringMatching(/^\/leave\/requests\//));
    expect(within(rows[0]!).getByText('Chờ duyệt')).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/\(chiều\) – /)).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Đã duyệt')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Cần bổ sung')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo đơn nghỉ' })).toHaveAttribute('href', '/leave/new');
  });

  it('shows a negative balance in danger with the advance warning', async () => {
    open({ balances: balancesOf(-1.5) });
    const card = await screen.findByRole('region', { name: `Phép năm ${YEAR}` });
    expect(within(card).getByText('−1,5')).toHaveClass('text-danger');
    expect(within(card).getByText('ngày, đang ứng trước')).toBeInTheDocument();
    expect(within(card).getByText('Đã ứng trước 1,5 ngày Phép năm')).toBeInTheDocument();
  });

  it('says when there is no request yet in the year, and offers to create one', async () => {
    open({ mine: [] });
    expect(await screen.findByText(`Bạn chưa có đơn nghỉ nào năm ${YEAR}`)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Tạo đơn nghỉ' })).toHaveLength(2);
  });

  it('offers to retry when the balances do not load', async () => {
    const user = userEvent.setup();
    open({ failBalances: true });
    expect(await screen.findByText('Không tải được số dư phép')).toBeInTheDocument();
    server.use(...leaveApi().handlers);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('region', { name: `Phép năm ${YEAR}` })).toBeInTheDocument();
  });

  it('tells an Account without an Employee that only employees have leave, and points HR-like roles to the settings', async () => {
    open({}, { ...ADMIN_ACCOUNT, permissions: [...ADMIN_ACCOUNT.permissions, 'LEAVE_POLICY_EDIT'] });
    expect(await screen.findByText('Tài khoản này không có hồ sơ nhân viên')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở Cấu hình nghỉ phép' })).toHaveAttribute('href', '/leave-policies');
    expect(screen.queryByRole('link', { name: 'Tạo đơn nghỉ' })).not.toBeInTheDocument();
  });
});
