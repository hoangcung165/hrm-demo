import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { ApprovalDelegation, EmployeeCard } from '@/features/approval/api';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalId, BAO, HUNG, MAI as MAI_CARD } from '@/test/approval-fixtures';
import { approvalApi, type ApprovalApiOptions } from '@/test/approval-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

/** Trần Thị Mai, HR, linked to her Employee. */
const MAI: Account = { ...HR_ACCOUNT, employeeId: 'e-11' };

const open = (search = '', session: Account = MAI, options: ApprovalApiOptions = {}) => {
  const api = approvalApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: `/approvals${search}` }) };
};
const table = async (name = 'Yêu cầu chờ tôi duyệt. Bấm một dòng để mở yêu cầu.') => {
  const found = await screen.findByRole('table', { name });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải yêu cầu' })).not.toBeInTheDocument());
  return found;
};
const rowOf = (found: HTMLElement, name: string) => within(found).getByRole('link', { name }).closest('tr')!;

describe('ApprovalsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('lists the requests waiting for the caller with the columns of the artboard and the tab counts', async () => {
    open();
    const found = await table();
    expect(within(found).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Người gửi', 'Yêu cầu', 'Bước', 'Gửi lúc', 'Tự duyệt', 'Mở']);
    const an = within(rowOf(found, 'Nguyễn Văn An'));
    expect(an.getByText('NV00021 · Nhóm Web')).toBeInTheDocument();
    expect(an.getByText('Cập nhật hồ sơ')).toBeInTheDocument();
    expect(an.getByText('Cấp 2/2')).toBeInTheDocument();
    expect(an.getByText('HR')).toBeInTheDocument();
    expect(an.getByText('Còn 1 ngày')).toBeInTheDocument();
    // A delegated row, a resubmitted one and a flow without auto-approval.
    expect(within(rowOf(found, 'Nguyễn Văn Khoa')).getByText('Duyệt thay Phạm Quốc Bảo')).toBeInTheDocument();
    expect(within(rowOf(found, 'Nguyễn Văn Khoa')).getByText('Quản lý trực tiếp')).toBeInTheDocument();
    expect(within(rowOf(found, 'Cao Minh Trí')).getByText('Đã bổ sung, gửi lại')).toBeInTheDocument();
    expect(within(rowOf(found, 'Đỗ Thành Trung')).getByText('Không tự duyệt')).toBeInTheDocument();
    expect(screen.getByText('Sắp xếp: gần hạn tự duyệt trước')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /^Chờ tôi duyệt\s*5$/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /^Tôi đã gửi\s*1$/ })).toBeInTheDocument();
    expect(screen.getByText('Hiển thị 1–5 trên 5 yêu cầu')).toBeInTheDocument();
    // The sidebar item carries the same count.
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: /Hộp thư duyệt/ })).toHaveTextContent('5');
    expect(within(nav).getByText('5 yêu cầu chờ bạn duyệt')).toBeInTheDocument();
  });

  it('opens a request from its row', async () => {
    const user = userEvent.setup();
    const { router } = open();
    const found = await table();
    await user.click(within(rowOf(found, 'Mạc Thị Quỳnh')).getByText('Email, địa chỉ'));
    expect(router.state.location.pathname).toBe(`/approvals/${approvalId(3)}`);
    expect(await screen.findByRole('heading', { name: 'Cập nhật hồ sơ của Mạc Thị Quỳnh' })).toBeInTheDocument();
  });

  it('switches tabs through the URL, with the columns of each tab', async () => {
    const user = userEvent.setup();
    const { router } = open();
    await table();
    await user.click(screen.getByRole('tab', { name: /Tôi đã gửi/ }));
    const sent = await table('Yêu cầu tôi đã gửi. Bấm một dòng để mở yêu cầu.');
    expect(router.state.location.search).toBe('?box=sent');
    expect(within(sent).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Yêu cầu', 'Trạng thái', 'Gửi lúc', 'Cập nhật', 'Mở']);
    const returned = within(sent).getAllByRole('row')[1]!;
    expect(within(returned).getByText('Trả về để bổ sung')).toBeInTheDocument();
    expect(within(returned).getByText('Cấp 1/2 · Quản lý trực tiếp')).toBeInTheDocument();
    expect(within(sent).getByText('Đã duyệt')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Đã xử lý' }));
    const handled = await table('Yêu cầu tôi đã xử lý. Bấm một dòng để mở yêu cầu.');
    expect(within(rowOf(handled, HUNG.fullName)).getByText('Bị từ chối')).toBeInTheDocument();
  });

  it('searches by sender and filters by request type, and says when nothing matches', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await table();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã người gửi' }), 'quynh');
    await waitFor(() => expect(api.requests.at(-1)).toContain('q=quynh'));
    const found = await table();
    expect(within(found).getAllByRole('row')).toHaveLength(2);

    await user.click(screen.getByRole('combobox', { name: 'Loại yêu cầu' }));
    await user.click(await screen.findByRole('option', { name: 'Nghỉ phép' }));
    expect(await screen.findByText('Không có yêu cầu nào khớp “quynh”')).toBeInTheDocument();
    expect(api.requests.at(-1)).toContain('type=LEAVE');

    await user.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' })[0]!);
    expect(within(await table()).getAllByRole('row')).toHaveLength(6);
  });

  it('shows the empty tab with the next step, and the error state with a retry', async () => {
    const user = userEvent.setup();
    const { router } = open('', MAI, { inbox: { WAITING: [], SENT: [], HANDLED: [] } });
    expect(await screen.findByText('Không còn yêu cầu nào chờ bạn duyệt')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xem yêu cầu đã xử lý' }));
    expect(router.state.location.search).toBe('?box=handled');
    expect(await screen.findByText('Bạn chưa xử lý yêu cầu nào')).toBeInTheDocument();
  });

  it('says when the inbox cannot be loaded', async () => {
    open('', MAI, { failList: true });
    expect(await screen.findByText('Không tải được hộp thư duyệt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('tells a delegate whose approvals they do, and a delegator that they still approve', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const delegation = (delegator: EmployeeCard, delegate: EmployeeCard): ApprovalDelegation => ({
      id: `d-${delegator.id}`, delegator, delegate, startDate: today, endDate: '2026-12-31', requestTypes: ['LEAVE'], status: 'ACTIVE', endedAt: null,
    });
    open('', MAI, { delegations: { received: [delegation(BAO, MAI_CARD)], given: [delegation(MAI_CARD, HUNG)] } });
    expect(await screen.findByText(/Bạn đang duyệt thay/)).toHaveTextContent('Bạn đang duyệt thay Phạm Quốc Bảo đến hết 31/12/2026.');
    expect(screen.getByText(/Bạn đang ủy quyền duyệt cho/)).toHaveTextContent('Lê Văn Hùng đến hết 31/12/2026. Bạn vẫn duyệt được.');
  });

  it('explains that an Account without an Employee has no inbox, and hides the sidebar item', async () => {
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/approvals' });
    expect(await screen.findByText('Tài khoản chưa gắn với hồ sơ nhân viên')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: /Hộp thư duyệt/ })).not.toBeInTheDocument();
  });
});
