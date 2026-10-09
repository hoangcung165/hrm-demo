import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeExportApi, importTemplateApi, type ExcelApi } from '@/test/employee-excel-handlers';
import { employeeListApi } from '@/test/employee-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { unitId } from '@/test/org-unit-fixtures';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

/** HR as the backend grants it from HRM-06 on. */
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const ACCOUNTANT: Account = { ...HR_ACCOUNT, roles: ['ACCOUNTANT'], permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'EMPLOYEE_VIEW', 'EMPLOYEE_SENSITIVE_VIEW'] };

/** The names of the files handed to the browser, in order. jsdom has no object URLs and does not download. */
let saved: string[] = [];
URL.createObjectURL = () => 'blob:test';
URL.revokeObjectURL = () => {};

/** jsdom has no `matchMedia`: this one answers the phone query. */
const asPhone = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));

const open = (path: string, session: Account = HR, file: ExcelApi = employeeExportApi(), list = employeeListApi()) => {
  server.use(list.handler, file.handler, ...catalogApi().handlers, orgUnitsOk());
  return { file, list, ...renderRoutes(routes, { session, path }) };
};
/** The list once its rows are in. */
const listed = async () => {
  await screen.findByRole('table', { name: 'Danh sách nhân viên' });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách nhân viên' })).not.toBeInTheDocument());
};
const exportButton = () => screen.getByRole('button', { name: /^(Xuất Excel|Đang xuất…)$/ });

describe('Employee Excel export and template', () => {
  beforeEach(async () => {
    localStorage.clear();
    saved = [];
    const click = HTMLAnchorElement.prototype.click;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      if (this.download) saved.push(this.download);
      else click.call(this);
    });
    await i18n.changeLanguage('vi');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exports the current list under the server file name, busy meanwhile, and says how many', async () => {
    const { file } = open('/employees', HR, employeeExportApi({ delayMs: 50 }));
    await listed();
    const header = screen.getByRole('heading', { level: 1, name: 'Nhân viên' }).parentElement!;
    expect([...header.querySelectorAll('a, button')].map((control) => control.textContent)).toEqual(['Xuất Excel', 'Nhập từ Excel', 'Thêm nhân viên']);
    expect(within(header).getByRole('link', { name: 'Nhập từ Excel' })).toHaveAttribute('href', '/employees/import');

    await userEvent.click(exportButton());
    expect(exportButton()).toHaveTextContent('Đang xuất…');
    expect(exportButton()).toHaveAttribute('aria-busy', 'true');
    // A second click while busy sends nothing.
    await userEvent.click(exportButton());
    expect(await within(toastRegion()).findByText('Đã xuất 24 nhân viên ra file nhan-vien-2026-10-08.xlsx.')).toBeInTheDocument();
    expect(file.requests).toEqual(['status=PROBATION%2COFFICIAL']);
    expect(saved).toEqual(['nhan-vien-2026-10-08.xlsx']);
    expect(exportButton()).toHaveTextContent('Xuất Excel');
  });

  it('sends the search, filters and order of the URL, without the page', async () => {
    const { file } = open(`/employees?q=hung&orgUnitId=${unitId('WEB')}&includeSubUnits=false&status=ALL&sort=newest&page=1`);
    await listed();
    await userEvent.click(exportButton());
    await within(toastRegion()).findByText(/^Đã xuất/);
    expect(file.requests).toEqual([`q=hung&orgUnitId=${unitId('WEB')}&includeSubUnits=false&sort=hireDate%2Cdesc`]);
  });

  it('names the limit and the total when the filter matches too many, and saves nothing', async () => {
    open('/employees', HR, employeeExportApi({ fail: 'tooManyRows' }));
    await listed();
    await userEvent.click(exportButton());
    expect(await within(toastRegion()).findByText('Danh sách có 5.230 nhân viên, vượt giới hạn 5.000 nhân viên mỗi lần xuất.')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Lọc bớt theo đơn vị, chức danh hoặc trạng thái rồi xuất lại.')).toBeInTheDocument();
    expect(saved).toEqual([]);
  });

  it.each(['server', 'network'] as const)('says the file was not exported on a %s error', async (fail) => {
    open('/employees', HR, employeeExportApi({ fail }));
    await listed();
    await userEvent.click(exportButton());
    expect(await within(toastRegion()).findByText('Chưa xuất được file. Kiểm tra kết nối rồi thử lại.')).toBeInTheDocument();
    expect(saved).toEqual([]);
    expect(exportButton()).toBeEnabled();
  });

  it('cannot export an empty list, and a reader exports without the import and add actions', async () => {
    const view = open('/employees', HR, employeeExportApi(), employeeListApi([]));
    expect(exportButton()).toBeDisabled();
    await screen.findByText(/Chưa có nhân viên nào/);
    expect(exportButton()).toBeDisabled();
    expect(exportButton()).toHaveAttribute('title', 'Không có nhân viên nào để xuất');
    view.unmount();

    open('/employees', ACCOUNTANT);
    await listed();
    expect(exportButton()).toBeEnabled();
    expect(screen.queryByRole('link', { name: 'Nhập từ Excel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thêm nhân viên' })).not.toBeInTheDocument();
  });

  it('at 390 exports from "Thao tác khác", which holds only "Xuất Excel"', async () => {
    asPhone();
    const { file } = open('/employees?status=OFFICIAL', ACCOUNTANT);
    await within(await screen.findByRole('list', { name: 'Danh sách nhân viên' })).findAllByRole('listitem');
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh sách nhân viên' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Xuất Excel' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thao tác khác' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Xuất Excel']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Xuất Excel' }));
    expect(await within(toastRegion()).findByText(/^Đã xuất 24 nhân viên/)).toBeInTheDocument();
    expect(file.requests).toEqual(['status=OFFICIAL']);
    expect(saved).toEqual(['nhan-vien-2026-10-08.xlsx']);
  });

  it('opens the import page from "Nhập từ Excel" and downloads the template there', async () => {
    const template = importTemplateApi({ delayMs: 50 });
    server.use(template.handler);
    const { router } = open('/employees');
    await listed();
    await userEvent.click(screen.getByRole('link', { name: 'Nhập từ Excel' }));
    expect(router.state.location.pathname).toBe('/employees/import');
    expect(screen.getByRole('heading', { level: 1, name: 'Nhập nhân viên từ Excel' })).toBeInTheDocument();
    expect(screen.getByText('Chưa có file?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tải file mẫu' }));
    expect(screen.getByRole('button', { name: 'Đang tạo file mẫu…' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(saved).toEqual(['mau-nhap-nhan-vien.xlsx']));
    expect(await screen.findByRole('button', { name: 'Tải file mẫu' })).toBeInTheDocument();
    expect(template.requests).toHaveLength(1);
  });

  it('says when the template could not be downloaded', async () => {
    open('/employees/import', HR, importTemplateApi({ fail: 'server' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tải file mẫu' }));
    expect(await within(toastRegion()).findByText('Chưa tải được file mẫu. Kiểm tra kết nối rồi thử lại.')).toBeInTheDocument();
    expect(saved).toEqual([]);
  });

  it('refuses the import page without EMPLOYEE_EDIT, also at 390, and sends a phone to a computer', async () => {
    const view = open('/employees/import', ACCOUNTANT);
    expect(screen.getByRole('heading', { name: 'Bạn không nhập được nhân viên' })).toBeInTheDocument();
    expect(screen.getByText('Tài khoản có quyền “Thêm và sửa hồ sơ nhân viên” mới nhập được từ Excel.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về danh sách nhân viên' })).toHaveAttribute('href', '/employees');
    expect(screen.queryByRole('button', { name: 'Tải file mẫu' })).not.toBeInTheDocument();
    view.unmount();

    asPhone();
    const denied = open('/employees/import', ACCOUNTANT);
    expect(screen.getByRole('heading', { name: 'Bạn không nhập được nhân viên' })).toBeInTheDocument();
    denied.unmount();

    open('/employees/import', HR);
    expect(screen.getByRole('heading', { name: 'Nhập từ Excel dùng trên máy tính' })).toBeInTheDocument();
    expect(screen.getByText('Mở trang này trên máy tính để kiểm tra lỗi từng dòng trước khi nhập.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tải file mẫu' })).not.toBeInTheDocument();
  });
});
