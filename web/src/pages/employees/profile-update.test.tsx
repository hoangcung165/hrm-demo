import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalId, INBOX } from '@/test/approval-fixtures';
import { approvalApi } from '@/test/approval-handlers';
import { EMPLOYEES } from '@/test/employee-fixtures';
import { employeeProfile } from '@/test/employee-profile-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

/** Trần Thị Mai as an Employee who cannot edit profiles: she asks for changes. */
const MAI: Account = { ...HR_ACCOUNT, roles: ['EMPLOYEE'], permissions: ['COMPANY_VIEW'], employeeId: '00000000-0000-4000-c000-000000000011' };
const profile = { ...employeeProfile(EMPLOYEES[3]!), id: '00000000-0000-4000-c000-000000000011', fullName: 'Trần Thị Mai' };
const profileHandler = http.get('*/api/employees/00000000-0000-4000-c000-000000000011', () => HttpResponse.json(profile));

const open = (path: string, sent = INBOX.SENT) => {
  const api = approvalApi({ inbox: { ...INBOX, SENT: sent } });
  server.use(profileHandler, ...api.handlers);
  return { api, ...renderRoutes(routes, { session: MAI, path }) };
};
const personal = () => screen.findByRole('region', { name: 'Thông tin cá nhân' });

describe('Cập nhật hồ sơ (sender)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('"Hồ sơ của tôi" opens the own profile, where the Employee asks for a change with checked fields', async () => {
    const user = userEvent.setup();
    const { api, router } = open('/profile', []);
    await waitFor(() => expect(router.state.location.pathname).toBe('/employees/00000000-0000-4000-c000-000000000011'));
    await user.click(await within(await personal()).findByRole('button', { name: 'Đề nghị cập nhật' }));
    const dialog = screen.getByRole('dialog', { name: 'Đề nghị cập nhật hồ sơ' });
    const phone = within(dialog).getByLabelText('Số điện thoại', { selector: 'input[name="phone"]' });
    expect(phone).toHaveValue('0912 345 678');
    await user.clear(phone);
    await user.type(phone, '12345');
    await user.click(within(dialog).getByRole('button', { name: 'Gửi đề nghị' }));
    expect(within(dialog).getAllByText('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0, ví dụ 0912 345 678.')).toHaveLength(1);
    await user.clear(phone);
    await user.type(phone, '0987 654 321');
    await user.type(within(dialog).getByLabelText('Ghi chú cho người duyệt'), 'Em đổi số');
    await user.click(within(dialog).getByRole('button', { name: 'Gửi đề nghị' }));
    expect(await within(toastRegion()).findByText('Đã gửi đề nghị cập nhật hồ sơ')).toBeInTheDocument();
    expect(api.sentUpdates).toEqual([
      {
        id: null,
        body: {
          personalEmail: profile.personal.personalEmail,
          phone: '0987 654 321',
          address: profile.personal.address,
          // Phone numbers are shown grouped; the server takes them as typed.
          emergencyContact: { ...profile.personal.emergencyContact, phone: '0983 112 456' },
          note: 'Em đổi số',
        },
      },
    ]);
  });

  it('shows the request still open instead of the button', async () => {
    open('/employees/00000000-0000-4000-c000-000000000011');
    expect(await screen.findByText('Đề nghị cập nhật hồ sơ của bạn được trả về để bổ sung')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem yêu cầu' })).toHaveAttribute('href', `/approvals/${approvalId(11)}`);
    expect(within(await personal()).queryByRole('button', { name: 'Đề nghị cập nhật' })).not.toBeInTheDocument();
  });

  it('edits a returned request and sends it again at the same level', async () => {
    const user = userEvent.setup();
    const { api } = open(`/approvals/${approvalId(11)}`);
    expect(await screen.findByText('Gửi lại sẽ tiếp tục từ Cấp 1.', { exact: false })).toBeInTheDocument();
    const resend = await screen.findByRole('button', { name: 'Sửa và gửi lại' });
    await waitFor(() => expect(resend).toBeEnabled());
    await user.click(resend);
    const dialog = screen.getByRole('dialog', { name: 'Sửa và gửi lại' });
    // The proposal is filled in over the profile.
    expect(within(dialog).getByLabelText('Số điện thoại', { selector: 'input[name="phone"]' })).toHaveValue('0987654321');
    await user.click(within(dialog).getByRole('button', { name: 'Gửi lại' }));
    expect(await within(toastRegion()).findByText('Đã gửi lại đề nghị cập nhật hồ sơ')).toBeInTheDocument();
    expect(api.sentUpdates[0]).toMatchObject({ id: approvalId(11), body: { phone: '0987654321', address: 'Căn 1506, tòa A2, 2 Phạm Văn Bạch, Hà Nội' } });
  });

  it('cancels the request after asking', async () => {
    const user = userEvent.setup();
    const { api } = open(`/approvals/${approvalId(11)}`);
    await user.click(await screen.findByRole('button', { name: 'Hủy yêu cầu' }));
    const confirm = screen.getByRole('dialog', { name: 'Hủy yêu cầu cập nhật hồ sơ?' });
    await user.click(within(confirm).getByRole('button', { name: 'Hủy yêu cầu' }));
    expect(await within(toastRegion()).findByText('Đã hủy yêu cầu')).toBeInTheDocument();
    expect(api.cancelledRequests).toEqual([approvalId(11)]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Hủy yêu cầu' })).not.toBeInTheDocument());
  });
});
