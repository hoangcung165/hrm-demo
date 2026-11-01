import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { CONTRACT_EMPLOYEE_ID, CONTRACTS, contractItem, contractListApi, type ContractListApiOptions } from '@/test/contract-list-handlers';
import { ADMIN_ACCOUNT, EMPLOYEE_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (path = '/contracts', options: ContractListApiOptions = {}, session: Account = ADMIN_ACCOUNT) => {
  const api = contractListApi(options);
  server.use(api.handler);
  return { api, ...renderRoutes(routes, { session, path }) };
};
const table = () => screen.findByRole('table', { name: 'Danh sách hợp đồng' });
// Waits for the rows: the table is there, as skeleton rows, before the answer.
const rowOf = async (number: string) => (await within(await table()).findByRole('cell', { name: number })).closest('tr') as HTMLElement;
const lastRequest = (requests: URL[]) => requests.at(-1)!.searchParams;

describe('Hợp đồng', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists the contracts with the Employee, number, type, term and state, and links each to the Hợp đồng tab', async () => {
    const { api } = open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Hợp đồng' })).toBeInTheDocument();
    const grid = await table();
    const expiring = await rowOf('HD-0001');
    expect(within(grid).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Nhân viên', 'Số hợp đồng', 'Loại hợp đồng', 'Thời hạn', 'Trạng thái']);
    expect(api.requests[0]?.search).toBe('?page=0&size=20');
    expect(within(grid).getAllByRole('row')).toHaveLength(CONTRACTS.length + 1);
    // The link names the contract too, since one Employee can have several rows.
    expect(within(grid).getByRole('link', { name: /^Nguyễn Văn An/ })).toHaveAttribute('href', `/employees/${CONTRACT_EMPLOYEE_ID}?tab=contracts`);
    expect(within(expiring).getByText('NV00001')).toBeInTheDocument();
    expect(within(expiring).getByText('Hợp đồng xác định thời hạn')).toBeInTheDocument();
    expect(within(expiring).getByText('01/02/2026 – 21/11/2026')).toBeInTheDocument();
    expect(within(expiring).getByText('Sắp hết hạn')).toBeInTheDocument();
    expect(within(expiring).getByText('Còn 20 ngày')).toBeInTheDocument();
    expect(within(await rowOf('HD-0002')).getByText('Đang hiệu lực')).toBeInTheDocument();
    expect(within(await rowOf('HD-0003')).getByText('Sắp hiệu lực')).toBeInTheDocument();
    expect(within(await rowOf('HD-0003')).queryByText(/^Còn /)).not.toBeInTheDocument();
    const openEnded = await rowOf('HD-0004');
    expect(within(openEnded).getByText('01/03/2024 – không thời hạn')).toBeInTheDocument();
    expect(within(await rowOf('HD-0005')).getByText('Đã hết hạn')).toBeInTheDocument();
    expect(screen.getByText('Hiển thị 1–5 trên 5 hợp đồng.')).toBeInTheDocument();
  });

  it('shows no salary anywhere on the page', async () => {
    open();
    await rowOf('HD-0001');
    // The intro says that the list shows no salary, and the shell has "Bảng lương": look at the list itself.
    const grid = within(await table());
    expect(grid.queryByText(/lương|salary|₫|phụ cấp|allowance/i)).not.toBeInTheDocument();
    expect(grid.queryByText(/12345678/)).not.toBeInTheDocument();
  });

  it('combines search, type and state, keeps them in the URL, and clears them', async () => {
    const user = userEvent.setup();
    const { api, router } = open();
    await table();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm hợp đồng' }), 'anh');
    await waitFor(() => expect(lastRequest(api.requests).get('search')).toBe('anh'));
    // Accents are ignored by the API: "anh" finds Trần Thị Ánh.
    await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2));
    await user.click(screen.getByRole('combobox', { name: 'Loại hợp đồng' }));
    await user.click(await screen.findByRole('option', { name: 'Hợp đồng thử việc' }));
    await user.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    await user.click(await screen.findByRole('option', { name: 'Đang hiệu lực' }));
    await waitFor(() => expect([lastRequest(api.requests).get('search'), lastRequest(api.requests).get('type'), lastRequest(api.requests).get('state')]).toEqual(['anh', 'PROBATION', 'CURRENT']));
    expect(router.state.location.search).toBe('?q=anh&type=PROBATION&state=CURRENT');
    expect(within(await table()).getByRole('cell', { name: 'HD-0002' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(CONTRACTS.length + 1));
    expect(screen.getByRole('searchbox', { name: 'Tìm hợp đồng' })).toHaveValue('');
  });

  it('finds a contract by its number', async () => {
    const user = userEvent.setup();
    open();
    await table();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm hợp đồng' }), 'HD-0005');
    await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2));
    expect(within(screen.getByRole('table')).getByRole('cell', { name: 'HD-0005' })).toBeInTheDocument();
  });

  it('survives a reload: the URL fills the search and the filters and goes to the API', async () => {
    const { api } = open('/contracts?q=binh&type=fixed_term&state=UPCOMING');
    expect(await screen.findByRole('searchbox', { name: 'Tìm hợp đồng' })).toHaveValue('binh');
    expect(screen.getByRole('combobox', { name: 'Loại hợp đồng' })).toHaveTextContent('Hợp đồng xác định thời hạn');
    expect(screen.getByRole('combobox', { name: 'Trạng thái' })).toHaveTextContent('Sắp hiệu lực');
    await waitFor(() => expect([...api.requests[0]!.searchParams.entries()]).toEqual([['page', '0'], ['size', '20'], ['search', 'binh'], ['type', 'FIXED_TERM'], ['state', 'UPCOMING']]));
    expect(within(await table()).getByRole('cell', { name: 'HD-0003' })).toBeInTheDocument();
  });

  it('ignores a type or state it does not know in a shared URL', async () => {
    const { api } = open('/contracts?type=PIZZA&state=SOON');
    await table();
    expect(api.requests[0]?.search).toBe('?page=0&size=20');
  });

  it('pages on the server and keeps the page in the URL', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 21 }, (_, index) => contractItem(index + 1));
    const { api, router } = open('/contracts', { items: many });
    expect(await screen.findByText('Hiển thị 1–20 trên 21 hợp đồng.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Trang sau|Trang tiếp/ }));
    await waitFor(() => expect(lastRequest(api.requests).get('page')).toBe('1'));
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText('Hiển thị 21–21 trên 21 hợp đồng.')).toBeInTheDocument();
  });

  it('goes back to the last page when the URL is past the end', async () => {
    const { api, router } = open('/contracts?page=9');
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(lastRequest(api.requests).get('page')).toBe('0'));
    expect(await table()).toBeInTheDocument();
  });

  it('says there is no contract yet when the company has none', async () => {
    open('/contracts', { items: [] });
    expect(await screen.findByText('Chưa có hợp đồng')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument();
  });

  it('says nothing matches, and "Xóa bộ lọc" brings the list back', async () => {
    const user = userEvent.setup();
    const { router } = open('/contracts?q=nobody-by-this-name');
    expect(await screen.findByText('Không có hợp đồng phù hợp')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Xóa bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(await table()).toBeInTheDocument();
  });

  it('says the list did not load and loads it on retry', async () => {
    const user = userEvent.setup();
    const { api } = open('/contracts', { fail: { status: 500 } });
    expect(await screen.findByText('Không tải được danh sách hợp đồng. Hãy thử lại.')).toBeInTheDocument();
    server.use(contractListApi().handler);
    await user.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(await table()).toBeInTheDocument();
    expect(api.requests.length).toBeGreaterThan(0);
  });

  it('is denied without both permissions and asks the server for nothing', async () => {
    const { api } = open('/contracts', {}, EMPLOYEE_ACCOUNT);
    expect(await screen.findByText('Bạn không có quyền xem danh sách hợp đồng')).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(api.requests).toEqual([]);
  });

  it('is denied when the server refuses the list', async () => {
    open('/contracts', { fail: { status: 403 } });
    expect(await screen.findByText('Bạn không có quyền xem danh sách hợp đồng')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('at 390: compact rows with the state in words, each row linking to the Hợp đồng tab', async () => {
    asPhone();
    open();
    const list = await screen.findByRole('list', { name: 'Danh sách hợp đồng' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(CONTRACTS.length);
    const first = rows[0]!;
    expect(within(first).getByRole('link', { name: 'Nguyễn Văn An · HD-0001' })).toHaveAttribute('href', `/employees/${CONTRACT_EMPLOYEE_ID}?tab=contracts`);
    expect(within(first).getByText('Sắp hết hạn')).toBeInTheDocument();
    expect(within(first).getByText('Còn 20 ngày')).toBeInTheDocument();
    expect(within(first).getByText(/01\/02\/2026 – 21\/11\/2026/)).toBeInTheDocument();
  });

  it('opens the Employee profile from a click on the row', async () => {
    const user = userEvent.setup();
    const { router } = open();
    await user.click(within(await rowOf('HD-0001')).getByText('Hợp đồng xác định thời hạn'));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/employees/${CONTRACT_EMPLOYEE_ID}`));
    expect(router.state.location.search).toBe('?tab=contracts');
  });

  it('writes the page in English', async () => {
    await i18n.changeLanguage('en');
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Contracts' })).toBeInTheDocument();
    const grid = await screen.findByRole('table', { name: 'Contract list' });
    expect(within(grid).getByText('Expiring soon')).toBeInTheDocument();
    expect(within(grid).getByText('20 days left')).toBeInTheDocument();
    expect(within(grid).getByText('01/03/2024 – open-ended')).toBeInTheDocument();
    await i18n.changeLanguage('vi');
  });
});
