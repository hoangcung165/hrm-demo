import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { ACCOUNTS } from '@/test/account-fixtures';
import { accountListApi, accountsDenied, accountsFail } from '@/test/account-handlers';
import { tokens } from '@/test/auth-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const openPage = (search = '', session = ADMIN_ACCOUNT) => renderRoutes(routes, { session, path: `/accounts${search}` });
/** The table once its rows are in (it is also in the document, with Skeleton rows, while loading). */
const table = async (name = 'Danh sách tài khoản') => {
  const found = await screen.findByRole('table', { name });
  await waitFor(() => expect(screen.queryByRole('status', { name: /^(Đang tải danh sách tài khoản|Loading accounts)$/ })).not.toBeInTheDocument());
  return found;
};
/** The table row of an Account, found by its name cell. */
const rowOf = async (name: string) => within(await table()).getByText(name).closest('tr')!;
const bodyRows = async () => within(await table()).getAllByRole('row').slice(1);
const searchBox = () => screen.getByRole('searchbox', { name: 'Tìm tài khoản' });
const pager = () => screen.getByRole('navigation', { name: 'Phân trang' });
const choose = async (filter: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: filter }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};
/** jsdom has no `matchMedia`: this one answers the phone query of the list. */
const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

describe('AccountsPage: account list', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows busy skeleton rows and disabled filters while loading, then the first 20 Accounts', async () => {
    const api = accountListApi(ACCOUNTS, { delayMs: 50 });
    server.use(api.handler);
    openPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tài khoản' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status', { name: 'Đang tải danh sách tài khoản' })).toHaveAttribute('aria-busy', 'true');
    expect(searchBox()).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toBeDisabled();

    expect(await bodyRows()).toHaveLength(20);
    expect(api.requests).toEqual(['page=0&size=20']);
    expect(searchBox()).toBeEnabled();
    expect(within(await table()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Tài khoản', 'Vai trò', 'Phạm vi dữ liệu', 'Trạng thái', 'Ngày tạo']);
    expect(within(pager()).getByText('Hiển thị 1–20 trên 23 tài khoản')).toBeInTheDocument();
    // Read-only in this slice: nothing to add, no row actions.
    expect(screen.queryByRole('button', { name: /Thêm tài khoản|Thao tác cho/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument();
  });

  it('shows the name, email, roles, data scope, status and created date of a row', async () => {
    server.use(accountListApi().handler);
    openPage();
    const manager = await rowOf('Lê Văn Hùng');
    expect(within(manager).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'LHLê Văn Hùngdemo.line-manager@hrm.localPersona demo',
      'Quản lý trực tiếpNhân viên',
      'Đơn vị quản lý',
      'Đang hoạt động',
      '04/10/2026',
    ]);
    const locked = await rowOf('Hoàng Văn Nam');
    expect(within(locked).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['HNHoàng Văn Namnam.hoang@congty.vn', 'Nhân viên', 'Bản thân', 'Đã khóa', '01/10/2026']);
    expect(within(await rowOf('Hoàng Thị Thu')).getByText('Toàn công ty')).toBeInTheDocument();
  });

  it('marks the own row with "Bạn" and persona rows with "Persona demo"', async () => {
    server.use(accountListApi().handler);
    openPage();
    const own = await rowOf(ADMIN_ACCOUNT.fullName);
    expect(within(own).getByText('Bạn')).toBeInTheDocument();
    expect(within(own).queryByText('Persona demo')).not.toBeInTheDocument();
    expect(within(await table()).getAllByText('Bạn')).toHaveLength(1);
    // Seven personas; six of them on the first page.
    expect(within(await table()).getAllByText('Persona demo')).toHaveLength(6);
    expect(within(await rowOf('Bùi Thanh Tùng')).queryByText(/Bạn|Persona demo/)).not.toBeInTheDocument();
  });

  it('shows up to three roles, or two and "+n" that names the rest', async () => {
    server.use(accountListApi().handler);
    openPage();
    const three = (await rowOf('Đỗ Thành Trung')).cells[1]!;
    expect(three).toHaveTextContent(/^Quản lý trực tiếpPMNhân viên$/);
    const four = (await rowOf('Nguyễn Thị Hương')).cells[1]!;
    expect(within(four).getByText('HR')).toBeInTheDocument();
    expect(within(four).getByText('Quản lý trực tiếp')).toBeInTheDocument();
    expect(within(four).queryByText('PM')).not.toBeInTheDocument();
    expect(within(four).getByText('+2')).toHaveAttribute('aria-hidden', 'true');
    expect(within(four).getByText('và 2 vai trò khác: PM, Nhân viên')).toBeInTheDocument();
    expect(within(four).getByTitle('PM, Nhân viên')).toBeInTheDocument();
  });

  it('asks the server for the next page and keeps the page in the URL', async () => {
    const api = accountListApi();
    server.use(api.handler);
    const { router } = openPage();
    await table();
    await userEvent.click(within(pager()).getByRole('button', { name: 'Trang sau' }));
    expect(await within(pager()).findByText('Hiển thị 21–23 trên 23 tài khoản')).toBeInTheDocument();
    expect(api.requests).toEqual(['page=0&size=20', 'page=1&size=20']);
    expect(router.state.location.search).toBe('?page=2');
    expect(await bodyRows()).toHaveLength(3);
    expect(within(await table()).getByText('Vũ Thị Lan')).toBeInTheDocument();
    expect(within(pager()).getByRole('button', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(pager()).getByRole('button', { name: 'Trang 1' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('searches 300 ms after typing stops, without accents, and puts the query in the URL', async () => {
    const api = accountListApi();
    server.use(api.handler);
    const { router } = openPage('?page=2');
    await table();
    await userEvent.type(searchBox(), 'tran thi');
    // One request for the whole phrase, not one per key.
    await waitFor(() => expect(router.state.location.search).toBe('?q=tran+thi'));
    await waitFor(() => expect(api.requests).toEqual(['page=1&size=20', 'page=0&size=20&q=tran+thi']));
    await waitFor(async () => expect(await bodyRows()).toHaveLength(1));
    expect(within(await table()).getByText('Trần Thị Mai')).toBeInTheDocument();
    expect(within(pager()).getByText('Hiển thị 1–1 trên 1 tài khoản')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xóa nội dung tìm' }));
    expect(searchBox()).toHaveValue('');
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(async () => expect(await bodyRows()).toHaveLength(20));
  });

  it('keeps a filter chosen while the search is still settling', async () => {
    const api = accountListApi();
    server.use(api.handler);
    const { router } = openPage();
    await table();
    await userEvent.type(searchBox(), 'congty');
    // Inside the 300 ms: the search has not reached the URL yet.
    await choose('Vai trò', 'Quản lý trực tiếp');
    await choose('Trạng thái', 'Đang hoạt động');
    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('q')).toBe('congty'));
    expect(Object.fromEntries(new URLSearchParams(router.state.location.search))).toEqual({ q: 'congty', role: 'LINE_MANAGER', status: 'ACTIVE' });
    await waitFor(() => expect(api.requests.at(-1)).toBe('page=0&size=20&q=congty&role=LINE_MANAGER&status=ACTIVE'));
  });

  it('follows the URL when it changes from outside, as with Back', async () => {
    const api = accountListApi();
    server.use(api.handler);
    const { router } = openPage('?q=mai');
    await table();
    expect(searchBox()).toHaveValue('mai');
    await act(() => router.navigate('/accounts?q=lan&status=LOCKED'));
    await waitFor(() => expect(searchBox()).toHaveValue('lan'));
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Đã khóa');
    await waitFor(() => expect(api.requests.at(-1)).toBe('page=0&size=20&q=lan&status=LOCKED'));
    // Typing still works after it.
    await userEvent.type(searchBox(), ' ngo');
    await waitFor(() => expect(router.state.location.search).toBe('?q=lan+ngo&status=LOCKED'));
    expect(searchBox()).toHaveValue('lan ngo');
  });

  it('keeps the summary on the page whose rows are shown while the next page loads', async () => {
    const api = accountListApi(ACCOUNTS, { delayMs: 80 });
    server.use(api.handler);
    openPage();
    await table();
    await userEvent.click(within(pager()).getByRole('button', { name: 'Trang sau' }));
    // The request is out, the rows are still those of page 1: so is the summary.
    await waitFor(() => expect(api.requests).toHaveLength(2));
    expect(within(pager()).getByText('Hiển thị 1–20 trên 23 tài khoản')).toBeInTheDocument();
    expect(await bodyRows()).toHaveLength(20);
    expect(await within(pager()).findByText('Hiển thị 21–23 trên 23 tài khoản')).toBeInTheDocument();
    expect(await bodyRows()).toHaveLength(3);
  });

  it('filters by role and status, back on page 1, and clears every filter at once', async () => {
    const api = accountListApi();
    server.use(api.handler);
    const { router } = openPage('?page=2');
    await table();
    await choose('Vai trò', 'Nhân viên');
    await waitFor(() => expect(router.state.location.search).toBe('?role=EMPLOYEE'));
    expect(await within(pager()).findByText('Hiển thị 1–20 trên 21 tài khoản')).toBeInTheDocument();
    await choose('Trạng thái', 'Đã khóa');
    await waitFor(() => expect(router.state.location.search).toBe('?role=EMPLOYEE&status=LOCKED'));
    await waitFor(async () => expect(await bodyRows()).toHaveLength(2));
    expect(api.requests.at(-1)).toBe('page=0&size=20&role=EMPLOYEE&status=LOCKED');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('Nhân viên');
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Đã khóa');

    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('Tất cả vai trò');
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Tất cả trạng thái');
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument();
    await waitFor(() => expect(api.requests.at(-1)).toBe('page=0&size=20'));

    await choose('Vai trò', 'Admin');
    await choose('Vai trò', 'Tất cả vai trò');
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('restores search, filters and page from the URL, as after a reload', async () => {
    const api = accountListApi();
    server.use(api.handler);
    openPage('?q=congty&role=EMPLOYEE&status=ACTIVE&page=1');
    await waitFor(async () => expect(await bodyRows()).toHaveLength(13));
    expect(api.requests).toEqual(['page=0&size=20&q=congty&role=EMPLOYEE&status=ACTIVE']);
    expect(searchBox()).toHaveValue('congty');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('Nhân viên');
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Đang hoạt động');
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument();
  });

  it('restores everything from the URL when the session and the list are still loading, as after a real reload', async () => {
    // A reload has no access token: the refresh cookie and GET /api/me answer first, each after a while, then the list.
    const api = accountListApi(ACCOUNTS, { delayMs: 60 });
    const slow = async <T,>(answer: T) => (await delay(40), answer);
    server.use(
      http.post('*/api/auth/refresh', () => slow(tokens())),
      http.get('*/api/me', () => slow(HttpResponse.json(ADMIN_ACCOUNT))),
      api.handler,
    );
    const { router } = renderRoutes(routes, { session: 'restore', path: '/accounts?q=congty&role=EMPLOYEE&status=ACTIVE&page=2' });
    const url = '?q=congty&role=EMPLOYEE&status=ACTIVE&page=2';
    // Nothing of the page yet, and the URL is left alone meanwhile.
    expect(screen.queryByRole('searchbox', { name: 'Tìm tài khoản' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe(url);
    // The page is up while the list is still loading: the box and the Selects already hold the URL's values.
    expect(await screen.findByRole('status', { name: 'Đang tải danh sách tài khoản' })).toBeInTheDocument();
    expect(searchBox()).toHaveValue('congty');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('Nhân viên');
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Đang hoạt động');
    expect(router.state.location.search).toBe(url);
    // 13 Accounts match, so page 2 is past the end: the list goes to page 1 and keeps the filters.
    await waitFor(async () => expect(await bodyRows()).toHaveLength(13));
    expect(api.requests).toEqual(['page=1&size=20&q=congty&role=EMPLOYEE&status=ACTIVE', 'page=0&size=20&q=congty&role=EMPLOYEE&status=ACTIVE']);
    expect(router.state.location.search).toBe('?q=congty&role=EMPLOYEE&status=ACTIVE');
    // Well past the search delay: nothing wrote an empty search back.
    await delay(400);
    expect(searchBox()).toHaveValue('congty');
    expect(router.state.location.search).toBe('?q=congty&role=EMPLOYEE&status=ACTIVE');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('Nhân viên');
    expect(api.requests).toHaveLength(2);
  });

  it('ignores unknown filter values and goes back to the last page from a page past the end', async () => {
    const api = accountListApi();
    server.use(api.handler);
    const { router } = openPage('?role=BOSS&status=GONE&page=9');
    expect(await within(await table()).findByText('Vũ Thị Lan')).toBeInTheDocument();
    expect(api.requests).toEqual(['page=8&size=20', 'page=1&size=20']);
    expect(router.state.location.search).toBe('?role=BOSS&status=GONE&page=2');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('Tất cả vai trò');
  });

  it('says when nothing matches, quoting the query, and clears the filters from there', async () => {
    server.use(accountListApi().handler);
    const { router } = openPage('?q=thanh+h%C3%A0&role=ACCOUNTANT');
    const heading = await screen.findByRole('heading', { name: 'Không có tài khoản nào khớp “thanh hà”' });
    expect(screen.getByText('Kiểm tra lại họ tên hoặc email, hoặc xóa bộ lọc.')).toBeInTheDocument();
    // Announced politely, in a region that was already there.
    expect(heading.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const clear = screen.getAllByRole('button', { name: 'Xóa bộ lọc' });
    expect(clear).toHaveLength(2);
    await userEvent.click(clear[1]!);
    expect(await bodyRows()).toHaveLength(20);
    expect(router.state.location.search).toBe('');
    expect(searchBox()).toHaveValue('');
  });

  it('announces a search that ends with nothing in a live region that is there before the result', async () => {
    server.use(accountListApi().handler);
    openPage();
    await table();
    const region = screen.getAllByRole('status').find((status) => status.textContent === '')!;
    expect(region).toBeEmptyDOMElement();
    await userEvent.type(searchBox(), 'khong co ai');
    await waitFor(() => expect(region).toHaveTextContent('Không có tài khoản nào khớp “khong co ai”'));
    await userEvent.click(within(region).getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(region).toBeEmptyDOMElement());
  });

  it('says when nothing matches the filters alone', async () => {
    server.use(accountListApi().handler);
    openPage('?role=DIRECTOR&status=LOCKED');
    expect(await screen.findByRole('heading', { name: 'Không có tài khoản nào khớp' })).toBeInTheDocument();
  });

  it('shows the load error with the filters kept, and retries', async () => {
    server.use(accountsFail());
    openPage('?role=HR');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách tài khoản');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toHaveTextContent('HR');
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toBeEnabled();
    server.use(accountListApi().handler);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(async () => expect(await bodyRows()).toHaveLength(3));
  });

  it('denies an Account without ACCOUNT_LIST and does not call the API', () => {
    // No handler: a request would fail the test (onUnhandledRequest: 'error').
    openPage('', HR_ACCOUNT);
    expect(screen.getByRole('heading', { level: 1, name: 'Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền xem Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.getByText('Liên hệ quản trị viên nếu bạn cần quyền này.')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Tìm tài khoản' })).not.toBeInTheDocument();
  });

  it('shows the same denied state, without tabs, when the API answers 403', async () => {
    server.use(accountsDenied());
    openPage();
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền xem Tài khoản và vai trò' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('keeps the tab in the URL and shows the placeholder of the roles tab', async () => {
    server.use(accountListApi().handler);
    const { router } = openPage('?q=mai');
    await table();
    await userEvent.click(screen.getByRole('tab', { name: 'Vai trò và quyền' }));
    expect(router.state.location.search).toBe('?view=roles');
    expect(screen.getByRole('heading', { name: 'Bảng vai trò và quyền chưa có' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Tìm tài khoản' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Tài khoản' }));
    expect(router.state.location.search).toBe('');
    expect(await bodyRows()).toHaveLength(20);
  });

  it('lists compact two-line rows on a phone, without the scope and date, with previous and next', async () => {
    asPhone();
    const api = accountListApi();
    server.use(api.handler);
    openPage();
    const list = await screen.findByRole('list', { name: 'Danh sách tài khoản' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(20);
    // Without column headers, line two says what its Badges are; the labels are for screen readers only.
    expect(items[0]).toHaveTextContent(/^BTBùi Thanh Tùngtung\.bui@congty\.vnVai trò: Nhân viênTrạng thái: Đang hoạt động$/);
    expect(within(items[0]!).getByText('Vai trò:')).toHaveClass('sr-only');
    expect(within(items[0]!).getByText('Trạng thái:')).toHaveClass('sr-only');
    const own = within(list).getByText(ADMIN_ACCOUNT.fullName).closest('li')!;
    expect(own).toHaveTextContent(/Vai trò: AdminBạnTrạng thái: Đang hoạt động$/);
    expect(within(list).queryByText('Toàn công ty')).not.toBeInTheDocument();
    expect(within(pager()).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Trang trước', 'Trang sau']);
    await userEvent.click(within(pager()).getByRole('button', { name: 'Trang sau' }));
    expect(await within(pager()).findByText('Hiển thị 21–23 trên 23 tài khoản')).toBeInTheDocument();
    expect(api.requests.at(-1)).toBe('page=1&size=20');
  });

  it('is translated to English', async () => {
    await i18n.changeLanguage('en');
    server.use(accountListApi().handler);
    openPage();
    const list = await table('Account list');
    expect(screen.getByRole('heading', { level: 1, name: 'Accounts and roles' })).toBeInTheDocument();
    expect(within(list).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Account', 'Roles', 'Data scope', 'Status', 'Created']);
    expect(within(list).getByText('You')).toBeInTheDocument();
    expect(within(list).getAllByText('Demo persona')).toHaveLength(6);
    expect(within(list).getAllByText('Managed units')).toHaveLength(4);
    expect(within(list).getAllByText('Locked')).toHaveLength(2);
    expect(within(list).getByText('and 2 more roles: PM, Employee')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–20 of 23 accounts')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search accounts' })).toHaveAttribute('placeholder', 'Search by name or email');
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('All roles');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('All statuses');
    await userEvent.click(screen.getByRole('tab', { name: 'Roles and permissions' }));
    expect(screen.getByRole('heading', { name: 'The roles and permissions table is not here yet' })).toBeInTheDocument();
  });
});
