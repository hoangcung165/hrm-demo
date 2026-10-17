import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { positionId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const DEFAULT = 'page=0&size=20&status=PROBATION%2COFFICIAL';

const open = (search = '') => {
  const list = employeeListApi();
  server.use(list.handler, ...catalogApi().handlers, orgUnitsOk());
  return { list, ...renderRoutes(routes, { session: HR, path: `/employees${search}` }) };
};
const table = async () => {
  const found = await screen.findByRole('table', { name: 'Danh sách nhân viên' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách nhân viên' })).not.toBeInTheDocument());
  return found;
};
/** The names of the rows on screen (inside `waitFor`, until the rows of the last request are in). */
const names = () => within(screen.getByRole('table', { name: 'Danh sách nhân viên' })).queryAllByRole('link').map((link) => link.textContent);
const searchBox = () => screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' });
const choose = async (filter: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: filter }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};
const unitButton = () => screen.getByRole('button', { name: /^Đơn vị tổ chức: / });
/** jsdom has no `matchMedia`: this one answers the phone query of the list. */
const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

describe('EmployeesPage: search, filters and paging', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('searches by name without accents or by code once typing pauses, keeps it in the URL, and pages', async () => {
    const { list, router } = open();
    await table();
    await userEvent.type(searchBox(), 'tran thi');
    await waitFor(() => expect(list.requests.at(-1)).toBe('page=0&size=20&q=tran+thi&status=PROBATION%2COFFICIAL'));
    await waitFor(() => expect(names()).toEqual(['Trần Thị Mai']));
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('tran thi');
    // Typing does not send a request per key.
    expect(list.requests.filter((request) => request.includes('q='))).toHaveLength(1);

    await userEvent.clear(searchBox());
    await userEvent.type(searchBox(), 'nv00022');
    await waitFor(() => expect(names()).toEqual(['Nguyễn Văn An']));

    await userEvent.click(screen.getByRole('button', { name: 'Xóa từ khóa' }));
    await waitFor(() => expect(list.requests.at(-1)).toBe(DEFAULT));
    await userEvent.click(await screen.findByRole('button', { name: 'Trang 2' }));
    await waitFor(() => expect(list.requests.at(-1)).toBe('page=1&size=20&status=PROBATION%2COFFICIAL'));
    await waitFor(() => expect(names()).toEqual(['Nguyễn Văn An', 'Mạc Thị Quỳnh', 'Phan Khánh Duy', 'Phạm Thị Lan Anh']));
    expect(screen.getByText('Hiển thị 21–24 trên 24 nhân viên')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
  });

  it('filters by unit with or without its child units, searching the tree without accents', async () => {
    const { list, router } = open();
    await table();
    await userEvent.click(unitButton());
    const menu = await screen.findByRole('dialog', { name: 'Đơn vị tổ chức' });
    const tree = within(menu).getByRole('tree', { name: 'Đơn vị tổ chức' });
    expect(within(tree).getByRole('treeitem', { name: 'Tất cả đơn vị' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.type(within(menu).getByRole('searchbox', { name: 'Tìm đơn vị' }), 'game');
    // An inactive unit is tagged and can still be chosen.
    expect(within(tree).getByRole('treeitem', { name: 'Nhóm Game' })).toHaveAccessibleDescription('Ngừng hoạt động');
    await userEvent.clear(within(menu).getByRole('searchbox', { name: 'Tìm đơn vị' }));
    await userEvent.type(within(menu).getByRole('searchbox', { name: 'Tìm đơn vị' }), 'phat trien');
    await userEvent.click(within(menu).getByRole('treeitem', { name: 'Phòng Phát triển phần mềm' }));

    const ptpm = unitId('PTPM');
    await waitFor(() => expect(list.requests.at(-1)).toBe(`page=0&size=20&orgUnitId=${ptpm}&status=PROBATION%2COFFICIAL`));
    expect(screen.queryByRole('dialog', { name: 'Đơn vị tổ chức' })).not.toBeInTheDocument();
    expect(unitButton()).toHaveAccessibleName('Đơn vị tổ chức: Phòng Phát triển phần mềm');
    await waitFor(() => expect(names()).toHaveLength(10));
    expect(new URLSearchParams(router.state.location.search).get('orgUnitId')).toBe(ptpm);

    await userEvent.click(unitButton());
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Gồm các đơn vị con' }));
    await waitFor(() => expect(list.requests.at(-1)).toBe(`page=0&size=20&orgUnitId=${ptpm}&includeSubUnits=false&status=PROBATION%2COFFICIAL`));
    await waitFor(() => expect(names()).toEqual(['Nguyễn Văn Khoa', 'Vũ Thị Lan']));
  });

  it('filters by position and status, offers "Xóa bộ lọc", and goes back to the defaults', async () => {
    const { list, router } = open();
    await table();
    await choose('Chức danh', 'Trưởng phòng');
    await waitFor(() => expect(list.requests.at(-1)).toBe(`page=0&size=20&positionId=${positionId('TP')}&status=PROBATION%2COFFICIAL`));
    await waitFor(() => expect(names()).toHaveLength(7));
    // A deactivated position is marked.
    await userEvent.click(screen.getByRole('combobox', { name: 'Chức danh' }));
    expect(await screen.findByRole('option', { name: 'Thực tập sinh (ngừng hoạt động)' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(list.requests.at(-1)).toBe(DEFAULT));
    expect(router.state.location.search).toBe('');

    await choose('Trạng thái', 'Đã nghỉ việc');
    await waitFor(() => expect(list.requests.at(-1)).toBe('page=0&size=20&status=INACTIVE'));
    await waitFor(() => expect(names()).toEqual(['Lâm Gia Bảo', 'Tống Thị Ngọc']));
    const left = within(await table()).getByRole('link', { name: 'Lâm Gia Bảo' }).closest('tr')!;
    expect(left).toHaveTextContent('Đã nghỉ việc');
    expect(left).toHaveTextContent('Phòng Phát triển phần mềm · Ngừng hoạt động');

    await choose('Trạng thái', 'Tất cả trạng thái');
    await waitFor(() => expect(list.requests.at(-1)).toBe('page=0&size=20&status=ALL'));
    expect(await screen.findByText('Hiển thị 1–20 trên 26 nhân viên')).toBeInTheDocument();
  });

  it('says when nothing matches, names the filters in use, and clears them', async () => {
    const { list, router } = open(`?q=hoang%20long&orgUnitId=${unitId('WEB')}`);
    expect(await screen.findByRole('heading', { name: 'Không có nhân viên nào khớp “hoang long”' })).toBeInTheDocument();
    expect(
      await screen.findByText('Đang lọc: Nhóm Web và đơn vị con · Thử việc và chính thức. Thử tìm theo mã nhân viên hoặc bỏ bớt bộ lọc.'),
    ).toBeInTheDocument();
    expect(searchBox()).toHaveValue('hoang long');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' }).at(-1)!);
    await waitFor(() => expect(list.requests.at(-1)).toBe(DEFAULT));
    expect(router.state.location.search).toBe('');
    expect(searchBox()).toHaveValue('');
    expect(await screen.findByText('Hiển thị 1–20 trên 24 nhân viên')).toBeInTheDocument();
  });

  it('at 390: compact rows, "Lọc" with the filters in a dialog, and the order', async () => {
    asPhone();
    const { list } = open();
    const rows = await screen.findByRole('list', { name: 'Danh sách nhân viên' });
    expect(within(rows).getAllByRole('listitem')).toHaveLength(20);
    expect(within(rows).getAllByRole('listitem')[1]).toHaveTextContent('NV00002 · Trưởng phòng');
    expect(screen.getByRole('link', { name: 'Thêm nhân viên' })).toHaveTextContent('Thêm');
    expect(screen.getByText('1–20 trên 24')).toBeInTheDocument();
    expect(screen.getByText('Sắp xếp: mã nhân viên · Thử việc và chính thức')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Lọc/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Lọc nhân viên' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Sắp xếp' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Mới vào làm trước' }));
    await waitFor(() => expect(list.requests.at(-1)).toBe('page=0&size=20&status=PROBATION%2COFFICIAL&sort=hireDate%2Cdesc'));
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Xem 24 nhân viên' }));
    expect(screen.queryByRole('dialog', { name: 'Lọc nhân viên' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Lọc/ })).toHaveTextContent('1');
    expect(screen.getByText('Sắp xếp: mới vào làm trước · Thử việc và chính thức')).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Danh sách nhân viên' })).getAllByRole('listitem')[0]).toHaveTextContent('Phạm Thị Lan Anh'));
  });
});
