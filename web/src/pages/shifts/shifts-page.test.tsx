import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';
import { shiftApi } from '@/test/shift-handlers';
import { CA_DEM, HANH_CHINH, SHIFTS } from '@/test/shift-fixtures';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'SHIFT_VIEW', 'SHIFT_EDIT', 'SHIFT_ASSIGN'] };
const VIEWER: Account = { ...HR_ACCOUNT, roles: ['DIRECTOR'], permissions: [...HR_ACCOUNT.permissions, 'SHIFT_VIEW'] };

const open = (session: Account = HR, path = '/shifts', shifts = SHIFTS) => {
  const api = shiftApi(shifts);
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const table = () => screen.findByRole('table', { name: 'Danh sách ca làm việc' });
/** The row whose name cell reads `name` (a row has no name of its own). */
const rowOf = async (name: string) => (await screen.findByRole('cell', { name })).closest('tr') as HTMLElement;

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

describe('ShiftsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists the shifts by start with their times, break, tolerances, rounding, hours and status', async () => {
    open();
    const day = await rowOf('Hành chính');
    expect(within(day).getByText('08:00 – 17:00')).toBeInTheDocument();
    expect(within(day).getByText('12:00 – 13:00')).toBeInTheDocument();
    expect(within(day).getByText('Đi muộn: 5 phút')).toBeInTheDocument();
    expect(within(day).getByText('Gần nhất, bước 15 phút')).toBeInTheDocument();
    expect(within(day).getByText('8 giờ')).toBeInTheDocument();
    expect(within(day).getByText('Đang dùng')).toBeInTheDocument();
    expect(within(day).queryByText('Qua nửa đêm')).not.toBeInTheDocument();
    const names = within(await table()).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1]!.textContent);
    expect(names).toEqual(['Ca sáng', 'Ca cũ', 'Hành chính', 'Ca đêm']);
  });

  it('marks a shift that crosses midnight and shows its night hours', async () => {
    open();
    const night = await rowOf('Ca đêm');
    expect(within(night).getByText('22:00 – 06:00')).toBeInTheDocument();
    expect(within(night).getByText('Qua nửa đêm')).toBeInTheDocument();
    expect(within(night).getByText('Đêm: 8 giờ')).toBeInTheDocument();
  });

  it('filters by status and offers a way back when nothing matches', async () => {
    const user = userEvent.setup();
    open(HR, '/shifts', [CA_DEM, HANH_CHINH]);
    await table();
    await user.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    await user.click(await screen.findByRole('option', { name: 'Ngừng dùng' }));
    expect(await screen.findByText('Không có ca nào khớp bộ lọc')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(await rowOf('Ca đêm')).toBeInTheDocument();
  });

  it('adds a night shift 22:00–06:00 and shows it crossing midnight with its hours', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, '/shifts', [HANH_CHINH]);
    await user.click(await screen.findByRole('button', { name: 'Thêm ca làm việc' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm ca làm việc' });
    await user.type(within(dialog).getByLabelText(/^Mã ca/), 'dem');
    await user.type(within(dialog).getByLabelText(/^Tên ca/), 'Ca đêm');
    const start = within(dialog).getByLabelText(/^Giờ bắt đầu/);
    await user.clear(start);
    await user.type(start, '22:00');
    const end = within(dialog).getByLabelText(/^Giờ kết thúc/);
    await user.clear(end);
    await user.type(end, '6:00');
    expect(within(dialog).getByText('Giờ làm theo lịch: 8 giờ')).toBeInTheDocument();
    expect(within(dialog).getByText('Trong đó giờ làm đêm (22:00–06:00): 8 giờ')).toBeInTheDocument();
    expect(within(dialog).getByText('Ca qua nửa đêm, thuộc ngày bắt đầu.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Thêm ca làm việc' }));
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]).toEqual({
      method: 'POST',
      body: { code: 'DEM', name: 'Ca đêm', startTime: '22:00', endTime: '06:00', breakStart: null, breakEnd: null, lateToleranceMinutes: 0, earlyToleranceMinutes: 0, roundingMode: 'NONE', roundingMinutes: null },
    });
    expect(await within(toastRegion()).findByText('Đã thêm ca Ca đêm')).toBeInTheDocument();
    const night = await rowOf('Ca đêm');
    expect(within(night).getByText('Qua nửa đêm')).toBeInTheDocument();
    expect(within(night).getByText('Đêm: 8 giờ')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says what is wrong and how to fix it before anything is sent', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, '/shifts', [HANH_CHINH]);
    await user.click(await screen.findByRole('button', { name: 'Thêm ca làm việc' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm ca làm việc' });
    await user.type(within(dialog).getByLabelText(/^Mã ca/), 'bad code');
    const end = within(dialog).getByLabelText(/^Giờ kết thúc/);
    await user.clear(end);
    await user.type(end, '08:00');
    await user.type(within(dialog).getByLabelText(/^Nghỉ từ/), '12:00');
    await user.clear(within(dialog).getByLabelText(/^Cho phép đi muộn/));
    await user.type(within(dialog).getByLabelText(/^Cho phép đi muộn/), '130');
    await user.click(within(dialog).getByRole('button', { name: 'Thêm ca làm việc' }));
    expect(await within(dialog).findByText('Mã ca chỉ gồm chữ, số, gạch ngang hoặc gạch dưới, tối đa 20 ký tự.')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập tên ca.')).toBeInTheDocument();
    expect(within(dialog).getByText('Giờ kết thúc phải khác giờ bắt đầu. Ca 24 giờ không hợp lệ.')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập cả giờ bắt đầu và kết thúc nghỉ, hoặc bỏ trống cả hai.')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập số phút từ 0 đến 120.')).toBeInTheDocument();
    expect(api.writes).toEqual([]);
  });

  it('reports a code that is already taken on the code field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, '/shifts', [HANH_CHINH]);
    await user.click(await screen.findByRole('button', { name: 'Thêm ca làm việc' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm ca làm việc' });
    await user.type(within(dialog).getByLabelText(/^Mã ca/), 'hc');
    await user.type(within(dialog).getByLabelText(/^Tên ca/), 'Ca khác');
    await user.click(within(dialog).getByRole('button', { name: 'Thêm ca làm việc' }));
    expect(await within(dialog).findByText('Mã ca này đã có. Chọn một mã khác.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Mã ca/)).toHaveFocus();
    expect(api.writes).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Thêm ca làm việc' })).toBeInTheDocument();
  });

  it('edits a shift with its code locked, and saves only after a change', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, '/shifts', [HANH_CHINH]);
    await user.click(await screen.findByRole('button', { name: 'Thao tác với ca Hành chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sửa ca' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa ca: Hành chính' });
    expect(within(dialog).getByLabelText(/^Mã ca/)).toHaveAttribute('readonly');
    expect(within(dialog).getByLabelText(/^Giờ bắt đầu/)).toHaveValue('08:00');
    const save = within(dialog).getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).toBeDisabled();
    const late = within(dialog).getByLabelText(/^Cho phép đi muộn/);
    await user.clear(late);
    await user.type(late, '10');
    await user.click(save);
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]).toMatchObject({ method: 'PUT', id: HANH_CHINH.id, body: { lateToleranceMinutes: 10, roundingMode: 'NEAREST', roundingMinutes: 15, breakStart: '12:00', breakEnd: '13:00' } });
    expect(await within(toastRegion()).findByText('Đã lưu ca Hành chính')).toBeInTheDocument();
    expect(await screen.findByText('Đi muộn: 10 phút')).toBeInTheDocument();
  });

  it('asks before turning a shift off, and turns it on again after a confirmation', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, '/shifts', [HANH_CHINH, SHIFTS[3]!]);
    await user.click(await screen.findByRole('button', { name: 'Thao tác với ca Hành chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ngừng dùng' }));
    const ask = await screen.findByRole('dialog', { name: 'Ngừng dùng ca Hành chính?' });
    await user.click(within(ask).getByRole('button', { name: 'Hủy' }));
    expect(api.writes).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Thao tác với ca Hành chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ngừng dùng' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Ngừng dùng ca Hành chính?' })).getByRole('button', { name: 'Ngừng dùng' }));
    await waitFor(() => expect(api.writes).toEqual([{ method: 'deactivate', id: HANH_CHINH.id }]));
    expect(await within(toastRegion()).findByText('Đã ngừng dùng ca Hành chính')).toBeInTheDocument();
    await waitFor(async () => expect(within(await rowOf('Hành chính')).getByText('Ngừng dùng')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Thao tác với ca Hành chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Dùng lại' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Dùng lại ca Hành chính?' })).getByRole('button', { name: 'Dùng lại' }));
    await waitFor(() => expect(api.writes.at(-1)).toEqual({ method: 'reactivate', id: HANH_CHINH.id }));
    await waitFor(async () => expect(within(await rowOf('Hành chính')).getByText('Đang dùng')).toBeInTheDocument());
  });

  it('shows a viewer the list without any control to add, edit or turn off', async () => {
    open(VIEWER);
    await rowOf('Hành chính');
    expect(screen.getByText('Bạn chỉ xem được danh sách này')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm ca làm việc' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Thao tác với ca/ })).not.toBeInTheDocument();
    expect(within(await table()).queryByRole('columnheader', { name: 'Thao tác' })).not.toBeInTheDocument();
  });

  it('says so when the Account may not view shifts, and asks the server for nothing', async () => {
    let asked = false;
    server.use(http.get('*/api/shifts', () => ((asked = true), HttpResponse.json([]))));
    renderRoutes(routes, { session: HR_ACCOUNT, path: '/shifts' });
    expect(await screen.findByText('Bạn không có quyền xem ca làm việc')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm ca làm việc' })).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });

  it('offers to add the first shift when there is none, and to retry when the list does not load', async () => {
    const user = userEvent.setup();
    open(HR, '/shifts', []);
    expect(await screen.findByText('Chưa có ca làm việc')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Thêm ca làm việc' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Thêm ca làm việc' })[1]!);
    expect(await screen.findByRole('dialog', { name: 'Thêm ca làm việc' })).toBeInTheDocument();
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    const user = userEvent.setup();
    server.use(http.get('*/api/shifts', () => HttpResponse.json({ status: 500, code: 'internal' }, { status: 500 })));
    renderRoutes(routes, { session: HR, path: '/shifts' });
    expect(await screen.findByText('Không tải được danh sách ca làm việc')).toBeInTheDocument();
    server.use(...shiftApi([HANH_CHINH]).handlers);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowOf('Hành chính')).toBeInTheDocument();
  });

  it('at 390: compact rows with the times, the midnight mark, the hours and the status, and a 44px row menu', async () => {
    asPhone();
    open();
    const list = await screen.findByRole('list', { name: 'Danh sách ca làm việc' });
    const night = within(list).getAllByRole('listitem').find((item) => item.textContent?.includes('Ca đêm'))!;
    expect(night).toHaveTextContent('DEM');
    expect(night).toHaveTextContent('22:00 – 06:00');
    expect(night).toHaveTextContent('Qua nửa đêm');
    expect(night).toHaveTextContent('8 giờ');
    expect(night).toHaveTextContent('Đang dùng');
    expect(within(night).getByRole('button', { name: 'Thao tác với ca Ca đêm' })).toHaveClass('size-11');
  });

  it('writes the page in English', async () => {
    await i18n.changeLanguage('en');
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Shifts' })).toBeInTheDocument();
    const night = await rowOf('Ca đêm');
    expect(within(night).getByText('Crosses midnight')).toBeInTheDocument();
    expect(within(night).getByText('Night: 8 h')).toBeInTheDocument();
    await i18n.changeLanguage('vi');
  });
});
