import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';
import { shiftApi } from '@/test/shift-handlers';
import { shiftAssignApi, type ShiftAssignOptions } from '@/test/shift-assign-handlers';
import { AN, HUNG, shiftCalendarApi } from '@/test/shift-calendar-handlers';
import { CA_SANG, HANH_CHINH, SHIFTS } from '@/test/shift-fixtures';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'SHIFT_VIEW', 'SHIFT_EDIT', 'SHIFT_ASSIGN'] };
const VIEWER: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'SHIFT_VIEW'] };
// The week of Monday 12/10/2026 to Sunday 18/10/2026: five working days and a weekend off.
const WEEK = '/shift-calendar?view=week&date=2026-10-14';

function open(path = WEEK, assign: ShiftAssignOptions = {}, session: Account = HR) {
  const calendar = shiftCalendarApi();
  const writes = shiftAssignApi(assign);
  server.use(...calendar.handlers, ...shiftApi(SHIFTS).handlers, ...writes.handlers, orgUnitOptionsOk());
  return { calendar, writes, ...renderRoutes(routes, { session, path }) };
}
const dialog = () => screen.findByRole('dialog', { name: 'Phân ca' });
const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole('table', { name: /^Lịch phân ca, / });
  await user.click(screen.getByRole('button', { name: 'Phân ca' }));
  return dialog();
};
const pickShift = async (user: ReturnType<typeof userEvent.setup>, box: HTMLElement, name: RegExp) => {
  await user.click(within(box).getByRole('combobox', { name: /^Ca làm việc/ }));
  await user.click(await screen.findByRole('option', { name }));
};
const tickPeople = async (user: ReturnType<typeof userEvent.setup>, box: HTMLElement, ...names: string[]) => {
  for (const name of names) await user.click(await within(box).findByRole('checkbox', { name: new RegExp(name) }));
};

describe('Assigning shifts from the calendar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('offers the buttons only to an Account that may assign shifts', async () => {
    open(WEEK, {}, VIEWER);
    await screen.findByRole('table', { name: /^Lịch phân ca, / });
    expect(screen.queryByRole('button', { name: 'Phân ca' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ca mặc định' })).not.toBeInTheDocument();
  });

  it('says beforehand what an assignment adds and replaces, then sends it and reloads the calendar', async () => {
    const user = userEvent.setup();
    const { calendar, writes } = open(WEEK, { result: { employees: 2, created: 5, replaced: 5, unchanged: 0 } });
    const box = await openDialog(user);
    expect(within(box).getByRole('button', { name: /^Khoảng ngày/ })).toHaveTextContent('12/10/2026 – 18/10/2026');
    await tickPeople(user, box, 'Nguyễn Văn An', 'Lê Văn Hùng');
    await pickShift(user, box, /HC · Hành chính/);
    // An has only the default there, Hùng has Ca sáng assigned: 5 new, 5 replaced; the weekend is a day off.
    expect(await within(box).findByText('2 người × 5 ngày làm việc: 5 phân ca mới, 5 thay ca khác, 0 giữ nguyên.')).toBeInTheDocument();
    expect(within(box).getByText('Thay 5 phân ca đã có bằng ca này.')).toBeInTheDocument();
    expect(within(box).getByText('Bỏ qua 0 ngày lễ và 2 ngày nghỉ.')).toBeInTheDocument();
    const before = calendar.requests.length;
    await user.click(within(box).getByRole('button', { name: 'Phân ca' }));
    await waitFor(() => expect(writes.assigns).toEqual([{ shiftId: HANH_CHINH.id, employeeIds: [AN.id, HUNG.id], from: '2026-10-12', to: '2026-10-18' }]));
    expect(await within(toastRegion()).findByText('Đã phân ca HC cho 2 người')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('5 mới, 5 thay, 0 giữ nguyên')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Phân ca' })).not.toBeInTheDocument());
    // The calendar asks again, so the new shifts show at once.
    await waitFor(() => expect(calendar.requests.length).toBeGreaterThan(before));
    expect(screen.getByRole('button', { name: 'Phân ca' })).toHaveFocus();
  });

  it('sends the chosen weekdays, and nothing when none is chosen', async () => {
    const user = userEvent.setup();
    const { writes } = open();
    const box = await openDialog(user);
    await tickPeople(user, box, 'Nguyễn Văn An');
    await pickShift(user, box, /SANG/);
    await user.click(within(box).getByRole('checkbox', { name: 'Thứ Hai' }));
    await user.click(within(box).getByRole('checkbox', { name: 'Thứ Tư' }));
    expect(await within(box).findByText(/^1 người × 2 ngày làm việc/)).toBeInTheDocument();
    await user.click(within(box).getByRole('button', { name: 'Phân ca' }));
    await waitFor(() => expect(writes.assigns).toHaveLength(1));
    expect(writes.assigns[0]).toMatchObject({ shiftId: CA_SANG.id, weekdays: ['MONDAY', 'WEDNESDAY'] });
  });

  it('assigns a whole unit and sends the unit, not the people', async () => {
    const user = userEvent.setup();
    const { writes } = open();
    const box = await openDialog(user);
    await user.click(within(box).getByRole('radio', { name: 'Cả đơn vị' }));
    expect(within(box).queryByRole('list', { name: 'Nhân viên' })).not.toBeInTheDocument();
    await user.click(within(box).getByRole('button', { name: /^Đơn vị tổ chức: / }));
    await user.type(await screen.findByRole('searchbox', { name: 'Tìm đơn vị' }), 'nhom web');
    await user.click(await screen.findByRole('treeitem', { name: 'Nhóm Web' }));
    await pickShift(user, box, /HC · Hành chính/);
    await user.click(within(box).getByRole('button', { name: 'Phân ca' }));
    await waitFor(() => expect(writes.assigns).toEqual([{ shiftId: HANH_CHINH.id, orgUnitId: unitId('WEB'), from: '2026-10-12', to: '2026-10-18' }]));
  });

  it('asks for what is missing and sends nothing', async () => {
    const user = userEvent.setup();
    const { writes } = open();
    const box = await openDialog(user);
    await user.click(within(box).getByRole('button', { name: 'Phân ca' }));
    expect(await within(box).findByText('Chọn một ca.')).toBeInTheDocument();
    expect(within(box).getByText('Chọn ít nhất một người.')).toBeInTheDocument();
    expect(writes.assigns).toEqual([]);
    expect(box).toBeInTheDocument();
  });

  it('stays open and says the cause when the server refuses people outside the scope', async () => {
    const user = userEvent.setup();
    const { writes } = open(WEEK, { fail: { status: 403, code: 'shift_assignment.out_of_scope', extra: { count: 3 } } });
    const box = await openDialog(user);
    await tickPeople(user, box, 'Nguyễn Văn An');
    await pickShift(user, box, /HC · Hành chính/);
    await user.click(within(box).getByRole('button', { name: 'Phân ca' }));
    expect(await within(box).findByRole('alert')).toHaveTextContent('3 người nằm ngoài phạm vi dữ liệu của bạn. Bỏ họ khỏi danh sách hoặc chọn đơn vị của bạn.');
    expect(writes.assigns).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Phân ca' })).toBeInTheDocument();
  });

  it('says so when the server finds the range too long', async () => {
    const user = userEvent.setup();
    const { writes } = open(WEEK, { fail: { status: 400, code: 'validation.invalid', extra: { errors: [{ field: 'to', code: 'range_too_long' }] } } });
    const box = await openDialog(user);
    await tickPeople(user, box, 'Nguyễn Văn An');
    await pickShift(user, box, /HC · Hành chính/);
    await user.click(within(box).getByRole('button', { name: 'Phân ca' }));
    expect(await within(box).findByRole('alert')).toHaveTextContent('Khoảng ngày tối đa 62 ngày. Chọn khoảng ngắn hơn hoặc làm từng đợt.');
    expect(writes.assigns).toHaveLength(1);
  });

  it('clears assignments: counts only the assigned shifts, and the button says how many', async () => {
    const user = userEvent.setup();
    const { writes } = open(WEEK, { cleared: { employees: 1, removed: 5 } });
    const box = await openDialog(user);
    await user.click(within(box).getByRole('radio', { name: /^Xóa phân ca/ }));
    expect(within(box).queryByRole('combobox', { name: /^Ca làm việc/ })).not.toBeInTheDocument();
    expect(within(box).queryByRole('checkbox', { name: 'Thứ Hai' })).not.toBeInTheDocument();
    // An has only the default shift: nothing to clear, and the button is off.
    await tickPeople(user, box, 'Nguyễn Văn An');
    expect(await within(box).findByText(/^Không có phân ca nào trong khoảng này để xóa/)).toBeInTheDocument();
    expect(within(box).getByRole('button', { name: /^Xóa 0 phân ca/ })).toBeDisabled();
    await tickPeople(user, box, 'Nguyễn Văn An', 'Lê Văn Hùng');
    expect(await within(box).findByText('Sẽ xóa 5 phân ca của 1 người.')).toBeInTheDocument();
    await user.click(within(box).getByRole('button', { name: 'Xóa 5 phân ca' }));
    await waitFor(() => expect(writes.clears).toEqual([{ employeeIds: [HUNG.id], from: '2026-10-12', to: '2026-10-18' }]));
    expect(await within(toastRegion()).findByText('Đã xóa 5 phân ca của 1 người')).toBeInTheDocument();
  });

  it('opens from a day: the drawer button starts the range on that day', async () => {
    const user = userEvent.setup();
    open();
    const grid = await screen.findByRole('table', { name: /^Lịch phân ca, / });
    await user.click(within(grid).getAllByRole('button', { name: /^Lê Văn Hùng, 12\/10\/2026/ })[0]!);
    const drawer = await screen.findByRole('dialog', { name: /Thứ Hai, 12\/10\/2026/ });
    await user.click(await within(drawer).findByRole('button', { name: 'Phân ca ngày này' }));
    const box = await dialog();
    expect(within(box).getByRole('button', { name: /^Khoảng ngày/ })).toHaveTextContent('12/10/2026 – 12/10/2026');
  });

  it('lets a Line manager pick only the units of their scope', async () => {
    const user = userEvent.setup();
    const manager: Account = { ...HR, roles: ['LINE_MANAGER'], dataScope: 'ORG_UNIT', orgUnitIds: [unitId('WEB')] };
    open(WEEK, {}, manager);
    const box = await openDialog(user);
    await user.click(within(box).getByRole('radio', { name: 'Cả đơn vị' }));
    await user.click(within(box).getByRole('button', { name: /^Đơn vị tổ chức: / }));
    const tree = await screen.findAllByRole('treeitem');
    expect(tree.map((row) => row.textContent)).toEqual(['Nhóm Web']);
  });

  it('starts from the unit and the person the calendar is filtered by', async () => {
    const user = userEvent.setup();
    open(`${WEEK}&unit=${unitId('WEB')}&person=${AN.id}`);
    const box = await openDialog(user);
    expect(within(box).getByRole('radio', { name: 'Từng người' })).toBeChecked();
    expect(await within(box).findByRole('checkbox', { name: /Nguyễn Văn An/ })).toBeChecked();
    expect(within(box).getByText('Đã chọn 1 người')).toBeInTheDocument();
  });
});

describe('The default shift of a unit', () => {
  const WEB_DEFAULT = { orgUnitId: unitId('WEB'), defaultShiftId: CA_SANG.id };
  const openDefault = async (user: ReturnType<typeof userEvent.setup>, assign: ShiftAssignOptions, path = `${WEEK}&unit=${unitId('WEB')}`) => {
    const api = open(path, assign);
    await screen.findByRole('table', { name: /^Lịch phân ca, / });
    await user.click(screen.getByRole('button', { name: 'Ca mặc định' }));
    return { ...api, box: await screen.findByRole('dialog', { name: 'Ca mặc định của đơn vị' }) };
  };

  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows what the unit has now and saves nothing until it changes', async () => {
    const user = userEvent.setup();
    const { box } = await openDefault(user, { defaults: [WEB_DEFAULT] });
    expect(await within(box).findByText('Hiện tại: SANG.')).toBeInTheDocument();
    expect(within(box).getByRole('combobox', { name: /^Ca mặc định/ })).toHaveTextContent('SANG · Ca sáng');
    expect(within(box).getByRole('button', { name: 'Lưu' })).toBeDisabled();
  });

  it('sets a default shift for the unit', async () => {
    const user = userEvent.setup();
    const { box, writes } = await openDefault(user, { defaults: [WEB_DEFAULT] });
    await within(box).findByText('Hiện tại: SANG.');
    await user.click(within(box).getByRole('combobox', { name: /^Ca mặc định/ }));
    await user.click(await screen.findByRole('option', { name: /HC · Hành chính/ }));
    await user.click(within(box).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(writes.defaultWrites).toEqual([{ orgUnitId: unitId('WEB'), shiftId: HANH_CHINH.id }]));
    expect(await within(toastRegion()).findByText('Đã đặt ca mặc định HC cho Nhóm Web')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ca mặc định của đơn vị' })).not.toBeInTheDocument());
  });

  it('clears the default of the unit', async () => {
    const user = userEvent.setup();
    const { box, writes } = await openDefault(user, { defaults: [WEB_DEFAULT] });
    await within(box).findByText('Hiện tại: SANG.');
    await user.click(within(box).getByRole('combobox', { name: /^Ca mặc định/ }));
    await user.click(await screen.findByRole('option', { name: 'Không đặt riêng (dùng ca của đơn vị cha)' }));
    await user.click(within(box).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(writes.defaultWrites).toEqual([{ orgUnitId: unitId('WEB'), shiftId: null }]));
    expect(await within(toastRegion()).findByText('Đã bỏ ca mặc định của Nhóm Web')).toBeInTheDocument();
  });

  it('says which shift a unit without its own default uses', async () => {
    const user = userEvent.setup();
    const { box } = await openDefault(user, { defaults: [{ orgUnitId: unitId('PTPM'), defaultShiftId: HANH_CHINH.id }] });
    expect(await within(box).findByText('Chưa đặt riêng; đang dùng ca của Phòng Phát triển phần mềm: HC.')).toBeInTheDocument();
  });

  it('asks for a unit first', async () => {
    const user = userEvent.setup();
    const { box, writes } = await openDefault(user, { defaults: [] }, WEEK);
    expect(within(box).getByRole('combobox', { name: /^Ca mặc định/ })).toBeDisabled();
    expect(writes.defaultWrites).toEqual([]);
  });
});
