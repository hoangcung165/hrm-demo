import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import type { Account } from '@/features/auth/account';
import { accountId, ACCOUNTS } from '@/test/account-fixtures';
import { accountApi } from '@/test/account-handlers';
import { problem } from '@/test/auth-handlers';
import { ADMIN_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const openPage = (session: Account = ADMIN_ACCOUNT, search = '') => renderRoutes(routes, { session, path: `/accounts${search}` });
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách tài khoản' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách tài khoản' })).not.toBeInTheDocument());
  return found;
};
const rowOf = async (name: string) => within(await table()).getByText(name).closest('tr')!;
const addButton = () => screen.getByRole('button', { name: 'Thêm tài khoản' });
const menuButton = (name: string) => screen.getByRole('button', { name: `Thao tác cho ${name}` });
const dialog = (name: string) => screen.findByRole('dialog', { name });
const box = (within_: HTMLElement, name: string) => within(within_).getByRole('checkbox', { name });
const role = (within_: HTMLElement) => within(within_).getByRole('group', { name: /^Vai trò/ });
const field = (within_: HTMLElement, name: RegExp | string) => within(within_).getByLabelText(name);
const submit = (within_: HTMLElement, name: string) => within(within_).getByRole('button', { name });
/** The error line of a field: what its `aria-describedby` points at. */
const noteOf = (control: HTMLElement) => document.getElementById(control.getAttribute('aria-describedby')!.split(' ')[0]!)!;

async function openAdd() {
  await table();
  await userEvent.click(addButton());
  return dialog('Thêm tài khoản');
}
async function openEdit(name: string) {
  await table();
  await userEvent.click(menuButton(name));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Sửa' }));
  return dialog(`Sửa Tài khoản của ${name}`);
}
async function fillAdd(form: HTMLElement, values: { fullName?: string; email?: string; password?: string }) {
  if (values.fullName !== undefined) await userEvent.type(field(form, /^Họ và tên/), values.fullName);
  if (values.email !== undefined) await userEvent.type(field(form, /^Email/), values.email);
  if (values.password !== undefined) await userEvent.type(field(form, /^Mật khẩu tạm/), values.password);
}
const YEN = { fullName: 'Phan Thị Yến', email: 'yen.phan@congty.vn', password: 'Tam-2026-yen' };

describe('AccountsPage: add and edit an Account', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the add button and the actions column only with ACCOUNT_EDIT', async () => {
    server.use(...accountApi().handlers);
    const readOnly = openPage({ ...ADMIN_ACCOUNT, permissions: ADMIN_ACCOUNT.permissions.filter((permission) => permission !== 'ACCOUNT_EDIT') });
    expect(within(await table()).getAllByRole('columnheader')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /Thêm tài khoản|Thao tác cho/ })).not.toBeInTheDocument();
    readOnly.unmount();

    openPage();
    const headers = within(await table()).getAllByRole('columnheader');
    expect(headers).toHaveLength(6);
    expect(headers[5]).toHaveTextContent('Thao tác');
    expect(addButton()).toBeInTheDocument();
    // One menu button per row (what each menu holds: account-status.test.tsx).
    expect(screen.getAllByRole('button', { name: /^Thao tác cho/ })).toHaveLength(20);
    expect(within(await rowOf('Bùi Thanh Tùng')).getByRole('button', { name: 'Thao tác cho Bùi Thanh Tùng' })).toBeInTheDocument();
    // The roles tab has nothing to add.
    await userEvent.click(screen.getByRole('tab', { name: 'Vai trò và quyền' }));
    expect(screen.queryByRole('button', { name: 'Thêm tài khoản' })).not.toBeInTheDocument();
  });

  it('opens the add dialog with focus inside, Nhân viên ticked and the Employee disabled', async () => {
    server.use(...accountApi().handlers);
    openPage();
    const form = await openAdd();
    expect(field(form, /^Họ và tên/)).toHaveFocus();
    expect(within(form).getByText('Bạn đặt mật khẩu tạm và giao cho người dùng. Họ nên đổi mật khẩu sau khi đăng nhập.')).toBeInTheDocument();
    expect(noteOf(field(form, /^Email/))).toHaveTextContent('Dùng để đăng nhập.');
    expect(noteOf(field(form, /^Mật khẩu tạm/))).toHaveTextContent('8 đến 72 ký tự. Giao mật khẩu này cho người dùng; họ nên đổi mật khẩu sau khi đăng nhập.');
    expect(field(form, /^Mật khẩu tạm/)).toHaveAttribute('autocomplete', 'new-password');
    // The temporary password is shown while typing; the Admin can hide it.
    expect(field(form, /^Mật khẩu tạm/)).toHaveAttribute('type', 'text');
    await userEvent.click(within(form).getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(field(form, /^Mật khẩu tạm/)).toHaveAttribute('type', 'password');
    const employee = within(form).getByRole('combobox', { name: 'Nhân viên' });
    expect(employee).toBeDisabled();
    expect(noteOf(employee)).toHaveTextContent('Chọn được khi đã có hồ sơ nhân viên.');
    expect(within(role(form)).getAllByRole('checkbox').map((checkbox) => checkbox.parentElement!.textContent)).toEqual(['Admin', 'HR', 'Quản lý trực tiếp', 'PM', 'Kế toán', 'Giám đốc', 'Nhân viên']);
    expect(within(role(form)).getAllByRole('checkbox', { checked: true })).toEqual([box(form, 'Nhân viên')]);
    expect(role(form)).toHaveAccessibleDescription('Tài khoản có nhiều vai trò được cộng quyền của các vai trò đó. Xem chi tiết ở tab Vai trò và quyền.');
    // Esc closes, and focus goes back to the button that opened it.
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(addButton()).toHaveFocus();
  });

  it('adds an Account with one role: the body, the toast, the list and the focus', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    const { router } = openPage(ADMIN_ACCOUNT, '?role=EMPLOYEE');
    const form = await openAdd();
    await fillAdd(form, { ...YEN, email: '  Yen.Phan@Congty.vn ' });
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toEqual([{ method: 'POST', body: { fullName: 'Phan Thị Yến', email: 'yen.phan@congty.vn', roles: ['EMPLOYEE'], password: 'Tam-2026-yen', employeeId: null } }]);
    expect(within(toastRegion()).getByText('Đã thêm Tài khoản cho Phan Thị Yến')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Giao mật khẩu tạm cho Phan Thị Yến và nhắc đổi mật khẩu sau khi đăng nhập.')).toBeInTheDocument();
    // The list reloads with the filter the user had; the new Account sorts onto this page.
    const added = await waitFor(() => rowOf('Phan Thị Yến'));
    expect(within(added).getAllByRole('cell').slice(0, 4).map((cell) => cell.textContent)).toEqual(['PYPhan Thị Yếnyen.phan@congty.vn', 'Nhân viên', 'Bản thân', 'Đang hoạt động']);
    expect(router.state.location.search).toBe('?role=EMPLOYEE');
    expect(api.requests.at(-1)).toBe('page=0&size=20&role=EMPLOYEE');
    expect(addButton()).toHaveFocus();
  });

  it('adds an Account with several roles, sent in the order of the roles', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    const form = await openAdd();
    await fillAdd(form, YEN);
    await userEvent.click(box(form, 'PM'));
    await userEvent.click(box(form, 'HR'));
    await userEvent.click(box(form, 'Nhân viên'));
    await userEvent.click(box(form, 'Nhân viên'));
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body.roles).toEqual(['HR', 'PROJECT_MANAGER', 'EMPLOYEE']);
    expect(within(await waitFor(() => rowOf('Phan Thị Yến'))).getAllByRole('cell')[1]).toHaveTextContent('HRPMNhân viên');
  });

  it('validates before sending: required fields, the email, the password length and at least one role', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    const form = await openAdd();
    await userEvent.click(box(form, 'Nhân viên'));
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    expect(noteOf(field(form, /^Họ và tên/))).toHaveTextContent('Nhập họ và tên.');
    expect(noteOf(field(form, /^Email/))).toHaveTextContent('Nhập email.');
    expect(noteOf(field(form, /^Mật khẩu tạm/))).toHaveTextContent('Nhập mật khẩu tạm.');
    expect(role(form)).toHaveAccessibleDescription('Chọn ít nhất một vai trò.');
    expect(within(role(form)).getByRole('alert')).toHaveTextContent('Chọn ít nhất một vai trò.');
    // The first invalid field takes focus.
    expect(field(form, /^Họ và tên/)).toHaveFocus();
    expect(field(form, /^Họ và tên/)).toBeInvalid();

    await fillAdd(form, { fullName: '   ', email: 'yen.phan@', password: 'ngan-7' });
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    expect(noteOf(field(form, /^Họ và tên/))).toHaveTextContent('Nhập họ và tên.');
    expect(noteOf(field(form, /^Email/))).toHaveTextContent('Nhập email đúng định dạng, ví dụ an.nguyen@congty.vn.');
    expect(noteOf(field(form, /^Mật khẩu tạm/))).toHaveTextContent('Mật khẩu phải có ít nhất 8 ký tự.');
    await userEvent.type(field(form, /^Mật khẩu tạm/), 'x'.repeat(67));
    expect(noteOf(field(form, /^Mật khẩu tạm/))).toHaveTextContent('Mật khẩu quá dài. Dùng tối đa 72 ký tự.');
    // Ticking a role clears the group error.
    await userEvent.click(box(form, 'Kế toán'));
    expect(within(role(form)).queryByRole('alert')).not.toBeInTheDocument();
    expect(api.writes).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Thêm tài khoản' })).toBeInTheDocument();
  });

  it('shows an email that is taken under Email with whose Account holds it, and keeps the dialog and what was typed', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    const form = await openAdd();
    await fillAdd(form, { ...YEN, email: 'Tung.Bui@congty.vn' });
    await userEvent.click(box(form, 'HR'));
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    await waitFor(() => expect(noteOf(field(form, /^Email/))).toHaveTextContent('Email tung.bui@congty.vn đã dùng cho Tài khoản của Bùi Thanh Tùng. Nhập email khác.'));
    expect(field(form, /^Email/)).toHaveFocus();
    expect(field(form, /^Họ và tên/)).toHaveValue('Phan Thị Yến');
    expect(field(form, /^Mật khẩu tạm/)).toHaveValue('Tam-2026-yen');
    expect(box(form, 'HR')).toBeChecked();
    expect(within(toastRegion()).queryByRole('alert')).not.toBeInTheDocument();
    // Corrected, it goes through.
    await userEvent.clear(field(form, /^Email/));
    await userEvent.type(field(form, /^Email/), YEN.email);
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toHaveLength(2);
  });

  it('puts the field errors of the server under their fields', async () => {
    const errors = [
      { field: 'fullName', code: 'Size' },
      { field: 'email', code: 'Email' },
      { field: 'roles', code: 'Invalid' },
      { field: 'password', code: 'Size' },
    ];
    server.use(http.post('*/api/accounts', () => problem(400, 'validation.invalid', { errors })), ...accountApi().handlers);
    openPage();
    const form = await openAdd();
    await fillAdd(form, YEN);
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    await waitFor(() => expect(noteOf(field(form, /^Họ và tên/))).toHaveTextContent('Họ và tên quá dài. Dùng tối đa 100 ký tự.'));
    expect(noteOf(field(form, /^Email/))).toHaveTextContent('Nhập email đúng định dạng, ví dụ an.nguyen@congty.vn.');
    expect(noteOf(field(form, /^Mật khẩu tạm/))).toHaveTextContent('Mật khẩu quá dài. Dùng tối đa 72 ký tự.');
    expect(role(form)).toHaveAccessibleDescription('Thông tin chưa hợp lệ. Kiểm tra lại các ô.');
    expect(field(form, /^Họ và tên/)).toHaveFocus();
  });

  it('shows any other failure as a toast and keeps the dialog open with what was typed', async () => {
    server.use(http.post('*/api/accounts', () => problem(500, 'error.unknown')), ...accountApi().handlers);
    openPage();
    const form = await openAdd();
    await fillAdd(form, YEN);
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    const alert = await within(toastRegion()).findByRole('alert');
    expect(alert).toHaveTextContent('Không thêm được Tài khoản cho Phan Thị Yến');
    expect(alert).toHaveTextContent('Có lỗi xảy ra. Thử lại sau ít phút.');
    expect(screen.getByRole('dialog', { name: 'Thêm tài khoản' })).toBeInTheDocument();
    expect(field(form, /^Email/)).toHaveValue(YEN.email);
    expect(submit(form, 'Thêm tài khoản')).toBeEnabled();

    server.use(http.post('*/api/accounts', () => HttpResponse.error()));
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    await waitFor(() => expect(within(toastRegion()).getAllByRole('alert').at(-1)).toHaveTextContent('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'));
    expect(screen.getByRole('dialog', { name: 'Thêm tài khoản' })).toBeInTheDocument();
  });

  it('closes and shows the denied state when a save answers 403', async () => {
    server.use(http.post('*/api/accounts', () => problem(403, 'auth.forbidden')), ...accountApi().handlers);
    openPage();
    const form = await openAdd();
    await fillAdd(form, YEN);
    await userEvent.click(submit(form, 'Thêm tài khoản'));
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền xem Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm tài khoản' })).not.toBeInTheDocument();
    const alert = within(toastRegion()).getByRole('alert');
    expect(alert).toHaveTextContent('Không thêm được Tài khoản cho Phan Thị Yến');
    expect(alert).toHaveTextContent('Bạn không có quyền thực hiện việc này.');
  });

  it('opens the edit dialog with the row data, and saves only once something changed', async () => {
    const api = accountApi();
    server.use(...api.handlers);
    openPage();
    const form = await openEdit('Đinh Công Sơn');
    expect(within(form).getByText('Trạng thái và mật khẩu không đổi ở đây.')).toBeInTheDocument();
    expect(field(form, /^Họ và tên/)).toHaveValue('Đinh Công Sơn');
    expect(field(form, /^Email/)).toHaveValue('son.dinh@congty.vn');
    expect(within(form).queryByLabelText(/^Mật khẩu tạm/)).not.toBeInTheDocument();
    expect(within(form).getByRole('combobox', { name: 'Nhân viên' })).toBeDisabled();
    expect(within(role(form)).getAllByRole('checkbox', { checked: true })).toEqual([box(form, 'Quản lý trực tiếp'), box(form, 'Nhân viên')]);
    expect(box(form, 'Admin')).toBeEnabled();
    const save = submit(form, 'Lưu thay đổi');
    expect(save).toBeDisabled();
    // A role ticked and unticked again, or spaces around the name, are no change.
    await userEvent.click(box(form, 'PM'));
    expect(save).toBeEnabled();
    await userEvent.click(box(form, 'PM'));
    expect(save).toBeDisabled();
    await userEvent.click(box(form, 'Nhân viên'));
    await userEvent.click(box(form, 'Nhân viên'));
    await userEvent.type(field(form, /^Họ và tên/), ' ');
    expect(save).toBeDisabled();

    await userEvent.clear(field(form, /^Họ và tên/));
    await userEvent.type(field(form, /^Họ và tên/), 'Đinh Công Sơn Hà');
    await userEvent.click(box(form, 'PM'));
    await userEvent.click(save);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Exactly what the API takes: no password, no status.
    expect(api.writes).toEqual([{ method: 'PUT', id: accountId(3), body: { fullName: 'Đinh Công Sơn Hà', email: 'son.dinh@congty.vn', roles: ['LINE_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'], employeeId: null } }]);
    expect(within(toastRegion()).getByText('Đã lưu Tài khoản của Đinh Công Sơn Hà')).toBeInTheDocument();
    const saved = await waitFor(() => rowOf('Đinh Công Sơn Hà'));
    expect(within(saved).getAllByRole('cell')[1]).toHaveTextContent('Quản lý trực tiếpPMNhân viên');
    // Focus returns to the menu button of the row.
    await waitFor(() => expect(menuButton('Đinh Công Sơn Hà')).toHaveFocus());
  });

  it('returns focus to the row menu button when the edit dialog is cancelled', async () => {
    server.use(...accountApi().handlers);
    openPage();
    const form = await openEdit('Tạ Quang Vinh');
    expect(field(form, /^Họ và tên/)).toHaveFocus();
    await userEvent.click(submit(form, 'Hủy'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(menuButton('Tạ Quang Vinh')).toHaveFocus();
  });

  it('locks the Admin role when editing the own Account, and reads /api/me again after saving', async () => {
    const api = accountApi();
    let meCalls = 0;
    server.use(
      ...api.handlers,
      http.get('*/api/me', () => {
        meCalls += 1;
        const own = api.current().find((account) => account.id === ADMIN_ACCOUNT.id)!;
        return HttpResponse.json({ ...ADMIN_ACCOUNT, fullName: own.fullName, email: own.email, roles: own.roles });
      }),
    );
    openPage();
    const form = await openEdit('Quản trị viên');
    expect(box(form, 'Admin')).toBeChecked();
    expect(box(form, 'Admin')).toBeDisabled();
    expect(role(form)).toHaveAccessibleDescription(
      'Bạn không tự bỏ vai trò Admin của mình được. Tài khoản có nhiều vai trò được cộng quyền của các vai trò đó. Xem chi tiết ở tab Vai trò và quyền.',
    );
    await userEvent.clear(field(form, /^Họ và tên/));
    await userEvent.type(field(form, /^Họ và tên/), 'Trần Quản Trị');
    await userEvent.click(box(form, 'Nhân viên'));
    await userEvent.click(submit(form, 'Lưu thay đổi'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes[0]!.body).toEqual({ fullName: 'Trần Quản Trị', email: 'admin@hrm.local', roles: ['ADMIN', 'EMPLOYEE'], employeeId: null });
    expect(meCalls).toBe(1);
    // The header follows.
    expect(await screen.findByRole('button', { name: 'Menu Tài khoản: Trần Quản Trị' })).toBeInTheDocument();
    expect(within(await waitFor(() => rowOf('Trần Quản Trị'))).getByText('Bạn')).toBeInTheDocument();
  });

  it('does not read /api/me after editing another Account', async () => {
    let meCalls = 0;
    server.use(...accountApi().handlers, http.get('*/api/me', () => ((meCalls += 1), HttpResponse.json(ADMIN_ACCOUNT))));
    openPage();
    const form = await openEdit('Lý Gia Huy');
    await userEvent.click(box(form, 'PM'));
    await userEvent.click(submit(form, 'Lưu thay đổi'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(meCalls).toBe(0);
  });

  it('shows the last-Admin rule on the role group', async () => {
    // Another real Admin, so its checkbox is not locked; the server still refuses.
    const accounts = ACCOUNTS.map((account) => (account.id === accountId(22) ? { ...account, roles: ['ADMIN', 'EMPLOYEE'] as typeof account.roles } : account));
    server.use(http.put('*/api/accounts/:id', () => problem(409, 'account.last_admin')), ...accountApi(accounts).handlers);
    openPage(ADMIN_ACCOUNT, '?page=2');
    const form = await openEdit('Võ Thanh Tâm');
    await userEvent.click(box(form, 'Admin'));
    await userEvent.click(submit(form, 'Lưu thay đổi'));
    await waitFor(() => expect(role(form)).toHaveAccessibleDescription('Đây là Tài khoản Admin duy nhất đang hoạt động. Gán vai trò Admin cho một Tài khoản khác trước.'));
    expect(within(role(form)).getByRole('alert')).toBeInTheDocument();
    expect(box(form, 'Admin')).toHaveFocus();
    expect(box(form, 'Admin')).not.toBeChecked();
    expect(screen.getByRole('dialog', { name: 'Sửa Tài khoản của Võ Thanh Tâm' })).toBeInTheDocument();
  });

  it('says when the Account is gone, closes and reloads the list', async () => {
    const api = accountApi();
    server.use(http.put('*/api/accounts/:id', () => problem(404, 'account.not_found')), ...api.handlers);
    openPage();
    const form = await openEdit('Lý Gia Huy');
    await userEvent.click(box(form, 'PM'));
    const before = api.requests.length;
    await userEvent.click(submit(form, 'Lưu thay đổi'));
    const alert = await within(toastRegion()).findByRole('alert');
    expect(alert).toHaveTextContent('Không lưu được Tài khoản của Lý Gia Huy');
    expect(alert).toHaveTextContent('Tài khoản này không còn tồn tại. Danh sách đã được tải lại.');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(api.requests.length).toBeGreaterThan(before));
  });

  it('explains a demo persona that cannot be edited, should the server ever say so', async () => {
    server.use(http.put('*/api/accounts/:id', () => problem(409, 'account.demo_persona_not_editable')), ...accountApi().handlers);
    openPage();
    const form = await openEdit('Lý Gia Huy');
    await userEvent.click(box(form, 'PM'));
    await userEvent.click(submit(form, 'Lưu thay đổi'));
    expect(await within(toastRegion()).findByRole('alert')).toHaveTextContent('Đây là persona demo. Không sửa hoặc đặt mật khẩu cho Tài khoản này được.');
    expect(screen.getByRole('dialog', { name: 'Sửa Tài khoản của Lý Gia Huy' })).toBeInTheDocument();
  });

  it('puts the row action on the compact rows of a phone', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));
    try {
      server.use(...accountApi().handlers);
      openPage();
      const list = await screen.findByRole('list', { name: 'Danh sách tài khoản' });
      const own = within(list).getByText('Quản trị viên').closest('li')!;
      expect(within(own).getByRole('button', { name: 'Thao tác cho Quản trị viên' })).toBeInTheDocument();
      expect(within(within(list).getByText('Lê Văn Hùng').closest('li')!).getByRole('button', { name: 'Thao tác cho Lê Văn Hùng' })).toBeInTheDocument();
      await userEvent.click(within(own).getByRole('button', { name: 'Thao tác cho Quản trị viên' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Sửa' }));
      expect(await dialog('Sửa Tài khoản của Quản trị viên')).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(...accountApi().handlers);
    openPage();
    await screen.findByRole('table', { name: 'Account list' });
    await userEvent.click(await screen.findByRole('button', { name: 'Add account' }));
    const form = await dialog('Add account');
    expect(within(form).getByText('You set a temporary password and hand it to the user. They should change it after signing in.')).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Employee' }));
    await userEvent.click(submit(form, 'Add account'));
    expect(noteOf(field(form, /^Full name/))).toHaveTextContent('Enter the full name.');
    expect(noteOf(field(form, /^Temporary password/))).toHaveTextContent('Enter a temporary password.');
    expect(within(form).getByRole('group', { name: /^Roles/ })).toHaveAccessibleDescription('Choose at least one role.');
    await userEvent.click(submit(form, 'Cancel'));
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Bùi Thanh Tùng' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const edit = await dialog("Edit Bùi Thanh Tùng's account");
    expect(within(edit).getByText('Status and password are not changed here.')).toBeInTheDocument();
    expect(submit(edit, 'Save changes')).toBeDisabled();
  });
});
