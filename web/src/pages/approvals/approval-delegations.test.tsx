import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, addDays } from 'date-fns';
import { routes } from '@/app';
import type { ApprovalDelegation, EmployeeCard } from '@/features/approval/api';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { BAO, HUNG, MAI as MAI_CARD } from '@/test/approval-fixtures';
import { approvalApi, type ApprovalApiOptions } from '@/test/approval-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const MAI: Account = { ...HR_ACCOUNT, employeeId: 'e-11' };
const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');
const delegation = (id: string, delegator: EmployeeCard, delegate: EmployeeCard, status: ApprovalDelegation['status'], from: number, to: number, types: ApprovalDelegation['requestTypes'] = ['PROFILE_UPDATE', 'LEAVE', 'OVERTIME', 'ATTENDANCE_ADJUSTMENT', 'TIMESHEET']): ApprovalDelegation => ({
  id, delegator, delegate, startDate: day(from), endDate: day(to), requestTypes: types, status, endedAt: null,
});

const open = (options: ApprovalApiOptions = {}, path = '/approvals?box=delegations') => {
  const api = approvalApi(options);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session: MAI, path }) };
};

describe('Ủy quyền duyệt', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('lists the delegations the caller made and received, and ends one early after asking', async () => {
    const user = userEvent.setup();
    const { api } = open({
      delegations: {
        given: [delegation('d-1', MAI_CARD, HUNG, 'ACTIVE', -1, 2), delegation('d-2', MAI_CARD, HUNG, 'UPCOMING', 10, 12, ['LEAVE', 'OVERTIME'])],
        received: [],
      },
    });
    const given = await screen.findByRole('table', { name: 'Ủy quyền duyệt bạn đã tạo' });
    const rows = within(given).getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText('Tất cả loại cho phép ủy quyền')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Đang hiệu lực')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Nghỉ phép, Tăng ca (OT)')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Sắp tới')).toBeInTheDocument();
    expect(screen.getByText('Hiện không ai ủy quyền duyệt cho bạn.')).toBeInTheDocument();

    await user.click(within(rows[0]!).getByRole('button', { name: 'Kết thúc sớm' }));
    const dialog = screen.getByRole('dialog', { name: 'Kết thúc sớm ủy quyền cho Lê Văn Hùng?' });
    await user.click(within(dialog).getByRole('button', { name: 'Kết thúc sớm' }));
    expect(await within(toastRegion()).findByText('Đã kết thúc ủy quyền cho Lê Văn Hùng')).toBeInTheDocument();
    expect(api.ended).toEqual(['d-1']);
    expect(await within(given).findByText('Đã kết thúc')).toBeInTheDocument();
  });

  it('cancels one that has not started', async () => {
    const user = userEvent.setup();
    const { api } = open({ delegations: { given: [delegation('d-2', MAI_CARD, HUNG, 'UPCOMING', 10, 12)], received: [delegation('d-9', BAO, MAI_CARD, 'ACTIVE', 0, 5)] } });
    expect(await screen.findByRole('table', { name: 'Ủy quyền duyệt người khác giao cho bạn' })).toHaveTextContent('Phạm Quốc Bảo');
    await user.click(screen.getByRole('button', { name: 'Hủy ủy quyền' }));
    const dialog = screen.getByRole('dialog', { name: 'Hủy ủy quyền cho Lê Văn Hùng?' });
    await user.click(within(dialog).getByRole('button', { name: 'Hủy ủy quyền' }));
    await waitFor(() => expect(api.cancelled).toEqual(['d-2']));
    expect(await screen.findByText('Bạn chưa ủy quyền duyệt cho ai.')).toBeInTheDocument();
  });

  it('checks the delegate, the dates and the types before saving a new delegation', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('button', { name: 'Ủy quyền duyệt' }));
    const dialog = screen.getByRole('dialog', { name: 'Ủy quyền duyệt' });
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ủy quyền' }));
    expect(within(dialog).getByText('Chọn người được ủy quyền.')).toBeInTheDocument();
    expect(within(dialog).getByText('Chọn ngày kết thúc.')).toBeInTheDocument();
    expect(within(dialog).getByText('Chọn ít nhất một loại yêu cầu.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox', { name: 'Bảng lương' })).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Từ ngày/), day(5));
    await user.clear(within(dialog).getByLabelText(/Từ ngày/));
    await user.type(within(dialog).getByLabelText(/Từ ngày/), day(5));
    await user.type(within(dialog).getByLabelText(/Đến ngày/), day(3));
    expect(within(dialog).getByText(/^Đến ngày phải từ .* trở đi\.$/)).toBeInTheDocument();
    expect(api.created).toEqual([]);
  });

  it('saves a new delegation and shows it among the caller’s', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(await screen.findByRole('button', { name: 'Ủy quyền duyệt' }));
    const dialog = screen.getByRole('dialog', { name: 'Ủy quyền duyệt' });
    await user.click(within(dialog).getByRole('combobox', { name: /Người được ủy quyền/ }));
    await user.click(await screen.findByRole('option', { name: /Vũ Thị Lan/ }));
    await user.type(within(dialog).getByLabelText(/Đến ngày/), day(4));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Nghỉ phép' }));
    expect(within(dialog).getByText(/Vũ Thị Lan thấy cả yêu cầu đang chờ bạn/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ủy quyền' }));
    expect(await within(toastRegion()).findByText(/^Đã ủy quyền duyệt cho Vũ Thị Lan đến hết/)).toBeInTheDocument();
    expect(api.created).toEqual([{ delegateId: 'e-13', startDate: day(0), endDate: day(4), requestTypes: ['LEAVE'] }]);
    expect(await screen.findByRole('table', { name: 'Ủy quyền duyệt bạn đã tạo' })).toHaveTextContent('Vũ Thị Lan');
  });

  it('lets a delegate see only the requests they approve on someone’s behalf', async () => {
    const user = userEvent.setup();
    const { api } = open({ delegations: { given: [], received: [delegation('d-9', BAO, MAI_CARD, 'ACTIVE', 0, 5)] } }, '/approvals');
    await user.click(await screen.findByRole('combobox', { name: 'Duyệt với tư cách' }));
    await user.click(await screen.findByRole('option', { name: 'Duyệt thay' }));
    await waitFor(() => expect(api.requests.at(-1)).toContain('onBehalf=true'));
  });
});
