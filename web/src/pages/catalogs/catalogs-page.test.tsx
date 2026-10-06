import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi, catalogsFail } from '@/test/catalog-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const open = (search = '', session: Account = ADMIN_ACCOUNT) => {
  const api = catalogApi();
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: `/catalogs${search}` }) };
};
/** The list once its rows are in (while loading it is a busy Skeleton table). */
const table = async (name: string) => {
  const found = await screen.findByRole('table', { name });
  await waitFor(() => expect(screen.queryByRole('status', { name: /^(Đang tải danh mục|Loading the catalog)$/ })).not.toBeInTheDocument());
  return found;
};
const rowsOf = async (name: string) => within(await table(name)).getAllByRole('row').slice(1);
const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell').map((cell) => cell.textContent);
const headersOf = async (name: string) => within(await table(name)).getAllByRole('columnheader').map((header) => header.textContent);
const choose = async (filter: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: filter }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};

describe('CatalogsPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('opens on the positions, by name, with code and status, under its own nav item', async () => {
    const { api } = open();
    expect(screen.getByRole('heading', { level: 1, name: 'Danh mục' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chức danh' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Chức danh', 'Loại hợp đồng', 'Loại phụ cấp', 'Ngày lễ', 'Kỹ năng', 'Vai trò dự án']);
    expect(await headersOf('Chức danh')).toEqual(['Mã', 'Tên', 'Trạng thái']);
    const rows = await rowsOf('Chức danh');
    expect(rows.map((row) => cellsOf(row)[1])).toEqual(['Giám đốc', 'Nhân viên', 'Phó giám đốc', 'Thực tập sinh', 'Trưởng phòng']);
    expect(cellsOf(rows[3]!)).toEqual(['TTS', 'Thực tập sinh', 'Ngừng hoạt động']);
    expect(cellsOf(rows[0]!)[2]).toBe('Đang dùng');
    expect(screen.getByText('Hiển thị 1–5 trên 5 chức danh')).toBeInTheDocument();
    expect(api.requests).toEqual(['positions?page=0&size=20']);
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', { name: 'Danh mục' })).toHaveAttribute('aria-current', 'page');
    // An Admin edits: no read-only notice.
    expect(screen.queryByText('Bạn chỉ xem được danh mục')).not.toBeInTheDocument();
  });

  it('shows the columns of each catalog and keeps the tab in the URL', async () => {
    const { router } = open();
    await table('Chức danh');
    await userEvent.click(screen.getByRole('tab', { name: 'Loại hợp đồng' }));
    expect(router.state.location.search).toBe('?catalog=contract-types');
    expect(await headersOf('Loại hợp đồng')).toEqual(['Mã', 'Tên', 'Thời hạn', 'Trạng thái']);
    expect((await rowsOf('Loại hợp đồng')).map(cellsOf)).toEqual([
      ['KXDTH', 'HĐLĐ không xác định thời hạn', 'Không xác định thời hạn', 'Đang dùng'],
      ['XDTH', 'HĐLĐ xác định thời hạn', 'Xác định thời hạn, tối đa 36 tháng', 'Đang dùng'],
      ['TV', 'Hợp đồng thử việc', 'Thử việc', 'Đang dùng'],
    ]);

    await userEvent.click(screen.getByRole('tab', { name: 'Loại phụ cấp' }));
    expect(await headersOf('Loại phụ cấp')).toEqual(['Mã', 'Tên', 'Tính BHXH', 'Chịu thuế TNCN', 'Trạng thái']);
    expect((await rowsOf('Loại phụ cấp')).map(cellsOf)).toEqual([
      ['AN_TRUA', 'Phụ cấp ăn trưa', 'Không', 'Có', 'Đang dùng'],
      ['CHUC_VU', 'Phụ cấp chức vụ', 'Có', 'Có', 'Đang dùng'],
    ]);
  });

  it('lists the holidays of a year by date, with their ranges and days, and changes the year', async () => {
    const { api } = open('?catalog=holidays&year=2026');
    expect(await headersOf('Ngày lễ')).toEqual(['Ngày', 'Số ngày', 'Tên', 'Trạng thái']);
    expect((await rowsOf('Ngày lễ')).map(cellsOf)).toEqual([
      ['01/01/2026', '1', 'Tết Dương lịch', 'Đang dùng'],
      ['16/02 – 20/02/2026', '5', 'Tết Nguyên đán', 'Đang dùng'],
      ['01/09 – 02/09/2026', '2', 'Quốc khánh', 'Đang dùng'],
    ]);
    expect(screen.getByRole('searchbox', { name: 'Tìm theo tên' })).toBeInTheDocument();
    expect(api.requests.at(-1)).toBe('holidays?page=0&size=20&year=2026');
    await choose('Năm', 'Năm 2027');
    await waitFor(() => expect(api.requests.at(-1)).toBe('holidays?page=0&size=20&year=2027'));
    expect((await rowsOf('Ngày lễ')).map((row) => cellsOf(row)[2])).toEqual(['Tết Dương lịch 2027']);
  });

  it('shows the holidays of the current year when the URL names none', async () => {
    const { api } = open('?catalog=holidays');
    await table('Ngày lễ');
    expect(api.requests).toEqual([`holidays?page=0&size=20&year=${new Date().getFullYear()}`]);
    expect(screen.getByRole('combobox', { name: 'Năm' })).toHaveTextContent(`Năm ${new Date().getFullYear()}`);
  });

  it('searches by name without accents or by code, filters by status, and says when nothing matches', async () => {
    const { api } = open();
    await table('Chức danh');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }), 'truong');
    await waitFor(() => expect(api.requests.at(-1)).toBe('positions?page=0&size=20&q=truong'));
    expect((await rowsOf('Chức danh')).map((row) => cellsOf(row)[1])).toEqual(['Trưởng phòng']);

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }));
    await waitFor(() => expect(api.requests.at(-1)).toBe('positions?page=0&size=20'));
    await choose('Trạng thái', 'Ngừng hoạt động');
    await waitFor(() => expect(api.requests.at(-1)).toBe('positions?page=0&size=20&status=INACTIVE'));
    expect((await rowsOf('Chức danh')).map((row) => cellsOf(row)[1])).toEqual(['Thực tập sinh']);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' }), 'zzz');
    expect(await screen.findByRole('heading', { name: 'Không có chức danh nào khớp “zzz”' })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' }).at(-1)!);
    await waitFor(() => expect(api.requests.at(-1)).toBe('positions?page=0&size=20'));
    expect(await rowsOf('Chức danh')).toHaveLength(5);
  });

  it('says so when a catalog has no item yet', async () => {
    open('?catalog=skills');
    expect(await screen.findByRole('heading', { name: 'Chưa có kỹ năng nào' })).toBeInTheDocument();
    expect(screen.getByText('Thêm các kỹ năng công ty dùng để ghi vào hồ sơ nhân viên và tìm người cho dự án.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    server.use(catalogsFail());
    renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/catalogs' });
    expect(await screen.findByRole('heading', { name: 'Không tải được danh mục' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('is read-only, and says so, for an Account without CATALOG_EDIT, who has no nav item for it', async () => {
    open('?catalog=project-roles', HR_ACCOUNT);
    expect(screen.getByText('Bạn chỉ xem được danh mục')).toBeInTheDocument();
    expect((await rowsOf('Vai trò dự án')).map((row) => cellsOf(row)[1])).toEqual(['Kiểm thử viên', 'Lập trình viên']);
    expect(within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).queryByRole('link', { name: 'Danh mục' })).not.toBeInTheDocument();
  });
});
