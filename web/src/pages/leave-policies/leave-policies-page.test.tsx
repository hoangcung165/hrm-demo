import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { companyTodayIso } from '@/lib/company-time';
import { ANNUAL, PERSONAL } from '@/test/leave-fixtures';
import { leaveApi } from '@/test/leave-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'LEAVE_POLICY_EDIT'] };

const open = (session: Account = HR, path = '/leave-policies') => {
  const api = leaveApi();
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const form = (name: string) => screen.findByRole('form', { name });

describe('LeavePoliciesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('lists the types and shows the first one\'s policy; saves a new entitlement from a date', async () => {
    const user = userEvent.setup();
    const { api } = open();
    const nav = await screen.findByRole('navigation', { name: 'Loại nghỉ' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Phép nămPN · 12 ngày/năm, trừ số dư',
      'Nghỉ ốmOM · BHXH chi trả · Cần đính kèm giấy tờ',
      'Việc riêng có lươngVR · Công ty trả lương · Tối đa 3 ngày mỗi đơn',
      'Không lươngKL · Không lương',
      'Thêm loại nghỉ',
    ]);
    expect(within(nav).getByRole('button', { name: /^Phép năm/ })).toHaveAttribute('aria-current', 'true');
    const policy = await form('Chính sách Phép năm');
    expect(within(policy).getByLabelText(/^Mã/)).toHaveAttribute('readonly');
    expect(within(policy).getByLabelText(/^Định mức phép năm/)).toHaveValue('12');
    expect(within(policy).getByRole('radio', { name: 'Cộng dồn mỗi tháng 1/12 định mức' })).toBeChecked();
    expect(within(policy).getByLabelText(/^Phép tồn dùng đến/)).toHaveValue('31/03');
    expect(within(policy).getByText('Đang áp dụng, từ ban đầu')).toBeInTheDocument();
    const entitlement = within(policy).getByLabelText(/^Định mức phép năm/);
    await user.clear(entitlement);
    await user.type(entitlement, '14,5');
    await user.click(within(policy).getByRole('button', { name: 'Lưu chính sách' }));
    await waitFor(() => expect(api.savedPolicies).toHaveLength(1));
    expect(api.savedPolicies[0]).toEqual({ id: ANNUAL.id, body: expect.objectContaining({ effectiveFrom: companyTodayIso(), entitlementDays: 14.5, accrual: 'MONTHLY', seniorityStepYears: 5, carryOverExpiry: '03-31', limited: true }) });
    expect(within(toastRegion()).getByText('Đã lưu chính sách Phép năm')).toBeInTheDocument();
  });

  it('checks the fields before saving', async () => {
    const user = userEvent.setup();
    const { api } = open();
    const policy = await form('Chính sách Phép năm');
    await user.clear(within(policy).getByLabelText(/^Định mức phép năm/));
    await user.type(within(policy).getByLabelText(/^Định mức phép năm/), '12,3');
    await user.clear(within(policy).getByLabelText(/^Phép tồn dùng đến/));
    await user.type(within(policy).getByLabelText(/^Phép tồn dùng đến/), '31/13');
    await user.click(within(policy).getByRole('button', { name: 'Lưu chính sách' }));
    expect(await within(policy).findByText('Nhập định mức từ 0,5 đến 365 ngày, bước 0,5.')).toBeInTheDocument();
    expect(within(policy).getByText('Nhập ngày/tháng, ví dụ 31/03.')).toBeInTheDocument();
    expect(api.savedPolicies).toEqual([]);
  });

  it('adds a type, and shows the code taken by another one on its field', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('button', { name: 'Thêm loại nghỉ' }));
    const created = await form('Loại nghỉ mới');
    await user.type(within(created).getByLabelText(/^Tên loại nghỉ/), 'Nghỉ bù');
    await user.type(within(created).getByLabelText(/^Mã/), 'PN');
    await user.click(within(created).getByRole('button', { name: 'Tạo loại nghỉ' }));
    expect(await within(created).findByText('Mã này đã có loại nghỉ khác dùng. Chọn mã khác.')).toBeInTheDocument();
    await user.clear(within(created).getByLabelText(/^Mã/));
    await user.type(within(created).getByLabelText(/^Mã/), 'NB');
    await user.click(within(created).getByRole('button', { name: 'Tạo loại nghỉ' }));
    await waitFor(() => expect(api.createdTypes).toHaveLength(2));
    expect(api.createdTypes[1]).toEqual({ code: 'NB', name: 'Nghỉ bù', policy: expect.objectContaining({ pay: 'COMPANY', halfDayAllowed: true, limited: false, entitlementDays: null }) });
    expect(await form('Chính sách Nghỉ bù')).toBeInTheDocument();
  });

  it('turns a type off', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, `/leave-policies?type=${PERSONAL.id}`);
    const policy = await form('Chính sách Việc riêng có lương');
    await user.click(within(policy).getByRole('switch', { name: 'Đang dùng' }));
    await waitFor(() => expect(api.updatedTypes).toEqual([{ id: PERSONAL.id, body: { name: 'Việc riêng có lương', active: false } }]));
    expect(within(toastRegion()).getByText('Đã tắt Việc riêng có lương; đơn mới không chọn được loại này')).toBeInTheDocument();
  });

  it('is denied without the permission', async () => {
    open(EMPLOYEE_ACCOUNT);
    expect(await screen.findByText('Bạn không có quyền cấu hình nghỉ phép')).toBeInTheDocument();
  });
});
