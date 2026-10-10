import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalId } from '@/test/approval-fixtures';
import { approvalApi, type ApprovalApiOptions } from '@/test/approval-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

/** Trần Thị Mai, HR, linked to her Employee. */
const MAI: Account = { ...HR_ACCOUNT, employeeId: '00000000-0000-4000-c000-000000000011' };

const open = (n: number, options: ApprovalApiOptions = {}) => {
  const api = approvalApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: MAI, path: `/approvals/${approvalId(n)}` }) };
};
const decision = () => screen.findByRole('region', { name: 'Quyết định của bạn' });

describe('ApprovalRequestPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the request with its changes, the decision card, the steps, the log and its place in the inbox', async () => {
    open(1);
    expect(await screen.findByRole('heading', { name: 'Cập nhật hồ sơ của Nguyễn Văn An' })).toBeInTheDocument();
    expect(screen.getByText('NV00021 · Nhóm Web', { exact: false })).toBeInTheDocument();
    const changes = await screen.findByRole('table', { name: 'Các trường thay đổi' });
    const phone = within(changes).getByRole('rowheader', { name: 'Số điện thoại' }).closest('tr')!;
    expect(within(phone).getByText('0912 345 678')).toBeInTheDocument();
    expect(within(phone).getByText('0987 654 321')).toBeInTheDocument();
    expect(screen.getByText('Em vừa chuyển nhà và đổi số điện thoại.')).toBeInTheDocument();
    expect(within(await decision()).getByText('Đang chờ bạn · Cấp 2/2 · HR')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Các bước duyệt' });
    expect(within(steps).getAllByRole('listitem').map((item) => item.querySelector('span.font-medium')?.textContent)).toEqual([
      'Đã gửi', 'Cấp 1 · Quản lý trực tiếp', 'Cấp 2 · HR', 'Áp dụng vào hồ sơ',
    ]);
    expect(within(steps).getByText('Người duyệt: bạn, Trương Thị Ngọc Hân')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An gửi yêu cầu')).toBeInTheDocument();
    expect(await screen.findByText('Yêu cầu 1 / 5')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Yêu cầu tiếp theo: Nguyễn Văn Khoa' })).toHaveAttribute('href', `/approvals/${approvalId(2)}`);
  });

  it('approves with the optional note and opens the next request', async () => {
    const user = userEvent.setup();
    const { api, router } = open(1);
    await screen.findByText('Yêu cầu 1 / 5');
    await user.type(within(await decision()).getByLabelText('Ghi chú'), 'Đã đối chiếu với CCCD.');
    await user.click(within(await decision()).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/approvals/${approvalId(2)}`));
    expect(api.decisions).toEqual([`approve ${approvalId(1)} Đã đối chiếu với CCCD.`]);
    expect(within(toastRegion()).getByText('Đã duyệt yêu cầu của Nguyễn Văn An')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Đã áp dụng vào hồ sơ. Đang mở yêu cầu tiếp theo.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Nghỉ phép của Nguyễn Văn Khoa' })).toBeInTheDocument();
  });

  it('asks for a reason before rejecting, and turns read-only after returning', async () => {
    const user = userEvent.setup();
    const { api } = open(3);
    await user.click(within(await decision()).getByRole('button', { name: 'Từ chối' }));
    const reject = screen.getByRole('dialog', { name: 'Từ chối yêu cầu của Mạc Thị Quỳnh?' });
    await user.click(within(reject).getByRole('button', { name: 'Từ chối' }));
    expect(within(reject).getByText('Nhập lý do để người gửi biết cần sửa gì.')).toBeInTheDocument();
    expect(api.decisions).toEqual([]);
    await user.click(within(reject).getByRole('button', { name: 'Hủy' }));

    await user.click(within(await decision()).getByRole('button', { name: 'Trả về' }));
    const back = screen.getByRole('dialog', { name: 'Trả về để bổ sung' });
    expect(within(back).getByText(/tiếp tục từ Cấp 2 · HR/)).toBeInTheDocument();
    await user.type(within(back).getByLabelText(/Cần bổ sung gì/), 'Thiếu tên tòa nhà');
    await user.click(within(back).getByRole('button', { name: 'Trả về' }));
    expect(await within(toastRegion()).findByText('Đã trả về cho Mạc Thị Quỳnh bổ sung')).toBeInTheDocument();
    expect(api.decisions).toEqual([`return ${approvalId(3)} Thiếu tên tòa nhà`]);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Quyết định của bạn' })).not.toBeInTheDocument());
    expect(screen.getAllByText('“Thiếu tên tòa nhà”').length).toBeGreaterThan(0);
  });

  it('says so when someone else handled the request first', async () => {
    const user = userEvent.setup();
    open(4, { handledByOthers: true });
    await user.click(within(await decision()).getByRole('button', { name: 'Duyệt' }));
    expect(await screen.findByText('Yêu cầu đã được xử lý')).toBeInTheDocument();
    expect(screen.getByText(/Trương Thị Ngọc Hân đã duyệt lúc/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Quyết định của bạn' })).not.toBeInTheDocument();
  });

  it('shows the sender why their request came back, without the decision card', async () => {
    open(11);
    expect(await screen.findByText('Lê Văn Hùng cần bạn bổ sung')).toBeInTheDocument();
    expect(screen.getByText('Gửi lại sẽ tiếp tục từ Cấp 1.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Quyết định của bạn' })).not.toBeInTheDocument();
  });

  it('says when the request does not exist or is not the caller’s', async () => {
    server.use(...approvalApi().handlers);
    renderRoutes(routes, { session: MAI, path: `/approvals/${approvalId(99)}` });
    expect(await screen.findByText('Không tìm thấy yêu cầu')).toBeInTheDocument();
  });
});
