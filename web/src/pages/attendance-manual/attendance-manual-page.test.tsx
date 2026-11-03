import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { manualApi, type ManualApi } from '@/test/attendance-manual-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_VIEW', 'ATTENDANCE_MANUAL'] };
const WEB = unitId('WEB');
const PATH = `/attendance/manual?unit=${WEB}&from=2026-10-12`;

const open = (api: ManualApi = manualApi(), { session = HR, path = PATH }: { session?: Account; path?: string } = {}) => {
  server.use(orgUnitOptionsOk(), ...api.handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const grid = () => screen.findByRole('table', { name: /Công thủ công của Nhóm Web/ });

describe('AttendanceManualPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the week of the unit: entries, empty days, days without a shift', async () => {
    const { api } = open();
    const table = await grid();
    expect(api.lists[0]?.get('orgUnitId')).toBe(WEB);
    expect(api.lists[0]?.get('from')).toBe('2026-10-12');
    expect(api.lists[0]?.get('to')).toBe('2026-10-18');
    const [header, an, binh] = within(table).getAllByRole('row');
    expect(header).toHaveTextContent('T2 12/10');
    expect(within(an!).getByRole('button', { name: 'Nguyễn Văn An, T2 12/10: Đủ công' })).toBeInTheDocument();
    expect(within(an!).getByRole('button', { name: 'Nguyễn Văn An, T3 13/10: 08:20–17:00' })).toBeInTheDocument();
    expect(within(binh!).getByRole('button', { name: 'Trần Thị Bình, T2 12/10: chưa nhập' })).toBeInTheDocument();
    expect(within(binh!).getAllByText('Không có ca')).toHaveLength(3);
  });

  it('enters Nửa công for one cell and says what it saved', async () => {
    const { api } = open();
    await grid();
    await userEvent.click(screen.getByRole('button', { name: 'Trần Thị Bình, T2 12/10: chưa nhập' }));
    const dialog = await screen.findByRole('dialog', { name: 'Công thủ công · Trần Thị Bình' });
    expect(within(dialog).getByRole('radio', { name: /Đủ công/ })).toBeChecked();
    expect(within(dialog).queryByRole('button', { name: /Xóa/ })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: /Nửa công/ }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Ghi chú' }), 'Ốm buổi chiều');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu công thủ công' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.saves).toEqual([{ employeeIds: ['00000000-0000-4000-b000-000000000022'], from: '2026-10-12', to: '2026-10-12', kind: 'HALF', note: 'Ốm buổi chiều' }]);
    expect(within(toastRegion()).getByText('Đã lưu Nửa công cho 1 ngày công')).toBeInTheDocument();
    await waitFor(() => expect(api.lists.length).toBeGreaterThan(1));
  });

  it('enters times for the whole unit on a day and shows the field errors', async () => {
    const { api } = open(manualApi({ save: { status: 400, code: 'validation.invalid', errors: [{ field: 'out', code: 'before_in' }] } }));
    await grid();
    await userEvent.click(screen.getByRole('button', { name: 'Nhập cho cả đơn vị ngày T4 14/10' }));
    const dialog = await screen.findByRole('dialog', { name: 'Công thủ công · Nhóm Web' });
    expect(dialog).toHaveTextContent('Ngày T4 14/10, 2 người. Người không có ca ngày này được bỏ qua.');
    await userEvent.click(within(dialog).getByRole('radio', { name: /Giờ vào – ra/ }));
    const inBox = within(dialog).getByRole('textbox', { name: 'Giờ vào' });
    const outBox = within(dialog).getByRole('textbox', { name: 'Giờ ra' });
    await userEvent.clear(inBox);
    await userEvent.type(inBox, '8h');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu công thủ công' }));
    expect(within(dialog).getByText('Nhập giờ dạng HH:mm, ví dụ 08:00.')).toBeInTheDocument();
    expect(api.saves).toHaveLength(0);

    await userEvent.clear(inBox);
    await userEvent.type(inBox, '22:00');
    await userEvent.clear(outBox);
    await userEvent.type(outBox, '06:00');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu công thủ công' }));
    expect(await within(dialog).findByText('Giờ ra phải sau giờ vào; chỉ ca đêm mới ra vào sáng hôm sau.')).toBeInTheDocument();
    expect(api.saves).toEqual([{ orgUnitId: WEB, from: '2026-10-14', to: '2026-10-14', kind: 'TIMES', in: '22:00', out: '06:00' }]);
  });

  it('clears the entries of a person’s week', async () => {
    const { api } = open();
    await grid();
    await userEvent.click(screen.getByRole('button', { name: 'Nhập cả tuần cho Nguyễn Văn An' }));
    const dialog = await screen.findByRole('dialog', { name: 'Công thủ công · Nguyễn Văn An' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xóa 2 công thủ công' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.clears).toEqual([{ employeeIds: ['00000000-0000-4000-b000-000000000021'], from: '2026-10-12', to: '2026-10-18' }]);
    expect(within(toastRegion()).getByText('Đã xóa 2 công thủ công; các ngày này tính lại theo lần quẹt')).toBeInTheDocument();
  });

  it('asks for a unit first', async () => {
    const { api } = open(manualApi(), { path: '/attendance/manual' });
    expect(await screen.findByText('Chọn một đơn vị')).toBeInTheDocument();
    expect(api.lists).toHaveLength(0);
  });

  it('shows the denied state without ATTENDANCE_MANUAL', async () => {
    open(manualApi(), { session: { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_VIEW'] } });
    expect(await screen.findByText('Bạn không có quyền nhập công thủ công')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
