import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalFlowApi } from '@/test/approval-flow-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const ADMIN: Account = { ...ADMIN_ACCOUNT, permissions: [...ADMIN_ACCOUNT.permissions, 'APPROVAL_FLOW_EDIT'] };

const open = (path = '/approval-flows', session: Account = ADMIN) => {
  const api = approvalFlowApi();
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const table = () => screen.findByRole('table', { name: 'Loại yêu cầu và luồng duyệt' });
const rowOf = async (type: string) => within(await table()).getByRole('link', { name: type }).closest('tr')!;
const editor = (type: string) => screen.findByRole('region', { name: `Sửa luồng ${type}` });

describe('ApprovalFlowsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('lists every request type with its levels, auto-approve and delegation, and edits Cập nhật hồ sơ first', async () => {
    open();
    expect(within(await rowOf('Cập nhật hồ sơ')).getByText('2 cấp · Quản lý trực tiếp → HR')).toBeInTheDocument();
    expect(within(await rowOf('Cập nhật hồ sơ')).getByText('Sau 3 ngày')).toBeInTheDocument();
    expect(within(await rowOf('Tăng ca (OT)')).getByText('Không')).toBeInTheDocument();
    expect(within(await rowOf('Bảng lương')).getByText('3 cấp · HR → Kế toán → Giám đốc')).toBeInTheDocument();
    expect(within(await table()).getByRole('link', { name: 'Cập nhật hồ sơ' })).toHaveAttribute('aria-current', 'true');
    expect(within(await editor('Cập nhật hồ sơ')).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Luồng phê duyệt' })).toBeInTheDocument();
  });

  it('adds a level by role and changes the days, then saves the whole flow', async () => {
    const user = userEvent.setup();
    const { api } = open('/approval-flows?type=LEAVE');
    const leave = await editor('Nghỉ phép');
    expect(screen.queryByRole('region', { name: 'Thay đổi chưa lưu' })).not.toBeInTheDocument();
    await user.click(within(leave).getByRole('button', { name: 'Thêm cấp' }));
    await user.click(within(leave).getByRole('combobox', { name: /Vai trò/ }));
    await user.click(await screen.findByRole('option', { name: 'HR' }));
    const days = within(leave).getByLabelText('Tự duyệt sau');
    await user.clear(days);
    await user.type(days, '5');
    const bar = screen.getByRole('region', { name: 'Thay đổi chưa lưu' });
    expect(within(bar).getByText('Luồng Nghỉ phép có thay đổi chưa lưu')).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'Lưu luồng duyệt' }));
    expect(await within(toastRegion()).findByText('Đã lưu luồng Nghỉ phép')).toBeInTheDocument();
    expect(api.saved).toEqual([{ type: 'LEAVE', body: { levels: [{ rule: 'LINE_MANAGER', role: null }, { rule: 'ROLE', role: 'HR' }], autoApproveDays: 5, delegationAllowed: true } }]);
    expect(within(await rowOf('Nghỉ phép')).getByText('2 cấp · Quản lý trực tiếp → HR')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Thay đổi chưa lưu' })).not.toBeInTheDocument());
  });

  it('checks the days and the role before saving, and discards the changes', async () => {
    const user = userEvent.setup();
    const { api } = open('/approval-flows?type=LEAVE');
    const leave = await editor('Nghỉ phép');
    await user.click(within(leave).getByRole('button', { name: 'Thêm cấp' }));
    const days = within(leave).getByLabelText('Tự duyệt sau');
    await user.clear(days);
    await user.type(days, '45');
    expect(within(leave).getByText('Nhập số ngày từ 1 đến 30.')).toBeInTheDocument();
    expect(within(leave).getByText('Chọn vai trò duyệt cấp này.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu luồng duyệt' }));
    expect(await within(toastRegion()).findByText('Không lưu được luồng Nghỉ phép')).toBeInTheDocument();
    expect(api.saved).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(within(leave).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Thay đổi chưa lưu' })).not.toBeInTheDocument();
  });

  it('keeps auto-approve and delegation off for payroll, locked with the reason', async () => {
    open('/approval-flows?type=PAYROLL');
    const payroll = await editor('Bảng lương');
    expect(within(payroll).getByRole('switch', { name: 'Tự duyệt khi không ai xử lý' })).toBeDisabled();
    expect(within(payroll).getByRole('switch', { name: 'Cho phép Ủy quyền duyệt' })).toBeDisabled();
    expect(within(payroll).getByText('Bảng lương luôn cần người duyệt ở mọi cấp.')).toBeInTheDocument();
    expect(within(payroll).queryByLabelText('Tự duyệt sau')).not.toBeInTheDocument();
  });

  it('says so without APPROVAL_FLOW_EDIT, and hides the sidebar item', async () => {
    renderRoutes(routes, { session: HR_ACCOUNT, path: '/approval-flows' });
    expect(await screen.findByText('Bạn không cấu hình được luồng phê duyệt')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: 'Luồng phê duyệt' })).not.toBeInTheDocument();
  });
});
