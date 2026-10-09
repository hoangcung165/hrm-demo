import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { cleanCheck, IMPORT_FILE_NAME, importApi, importCheck, importResult, nextCodeOk, type ImportApi } from '@/test/employee-import-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

/** HR as the backend grants it from HRM-06 on. */
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const xlsx = (name = IMPORT_FILE_NAME, bytes = 4096) => new File([new Uint8Array(bytes)], name, { type: XLSX });

const open = (api: ImportApi = importApi()) => {
  server.use(...api.handlers, nextCodeOk());
  return { api, ...renderRoutes(routes, { session: HR, path: '/employees/import' }) };
};
// `applyAccept: false`: a file of any type can be dropped or picked with "All files".
const choose = async (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await userEvent.setup({ applyAccept: false }).upload(input, file);
};
const results = () => screen.findByRole('table', { name: `Kết quả kiểm tra file ${IMPORT_FILE_NAME}` });
const rowOf = async (number: number) =>
  within(await results())
    .getAllByRole('row')
    .find((row) => within(row).queryAllByRole('cell')[0]?.textContent === String(number))!;

describe('EmployeeImportPage: the wizard', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('checks a file at once, lists errors, existing and valid rows, then imports the valid ones skipping the errors', async () => {
    const { api } = open(importApi({ delayMs: 300 }));
    const steps = screen.getByRole('list', { name: 'Các bước' });
    expect(within(steps).getByText('Tải lên').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Chưa có file?')).toBeInTheDocument();

    await choose(xlsx());
    expect(await screen.findByText('Đang đọc file…')).toBeInTheDocument();
    expect(await screen.findByText('2 dòng có lỗi')).toBeInTheDocument();
    expect(within(steps).getByText('Kiểm tra').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('2 dòng hợp lệ, 1 dòng đã có. Sửa file rồi tải lên lại, hoặc bỏ qua dòng lỗi và nhập phần còn lại.')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Dòng lỗi2', 'Đã có1', 'Hợp lệ2', 'Tất cả5']);
    expect(screen.getByRole('tab', { name: /Dòng lỗi/ })).toHaveAttribute('aria-selected', 'true');

    // Every error of a row, with its column, header and value, in the form's words where a field rule exists.
    const four = await rowOf(4);
    expect(four).toHaveTextContent('E · Số CCCD “01234567” — Số CCCD gồm đúng 12 chữ số.');
    expect(four).toHaveTextContent('M · Mã đơn vị “WEBX” — Không có đơn vị mã “WEBX”. Xem mã ở sheet Danh mục của file mẫu.');
    const six = await rowOf(6);
    expect(within(six).getAllByRole('cell')[1]).toHaveTextContent('(trống)');
    expect(six).toHaveTextContent('E · Số CCCD “079196001234” — Số CCCD trùng với dòng 2 trong file.');
    expect(six).toHaveTextContent('C · Ngày sinh “1996-31-12” — Ngày chưa đúng dạng dd/mm/yyyy.');

    await userEvent.click(screen.getByRole('tab', { name: /Đã có/ }));
    const five = await rowOf(5);
    expect(five).toHaveTextContent('Trùng Số CCCD với hồ sơ Trần Thị Mai (NV00003). Bỏ qua, hồ sơ không bị thay đổi.');
    expect(within(five).getByRole('link', { name: 'Trần Thị Mai (NV00003)' })).toHaveAttribute('href', '/employees/00000000-0000-4000-b000-000000000003');
    await userEvent.click(screen.getByRole('tab', { name: /Hợp lệ/ }));
    expect(await rowOf(2)).toHaveTextContent('Nhóm Web · Chuyên viên · Vào làm 02/11/2026 · Thử việc');

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua 2 dòng lỗi, tiếp tục' }));
    const confirm = screen.getByRole('region', { name: 'Xác nhận nhập' });
    expect(within(confirm).getByText('2 nhân viên mới')).toBeInTheDocument();
    expect(await within(confirm).findByText('Cấp tự động, từ NV00025')).toBeInTheDocument();
    expect(within(confirm).getByText('1 Thử việc, 1 Chính thức')).toBeInTheDocument();
    expect(within(confirm).getByText('2 dòng lỗi, 1 dòng đã có')).toBeInTheDocument();
    expect(within(confirm).getByText(IMPORT_FILE_NAME)).toBeInTheDocument();
    expect(within(confirm).getByText('Nhập là tất cả hoặc không có gì')).toBeInTheDocument();

    await userEvent.click(within(confirm).getByRole('button', { name: 'Nhập 2 nhân viên' }));
    expect(await screen.findByRole('button', { name: 'Đang nhập 2 nhân viên…' })).toBeDisabled();
    expect(await screen.findByRole('heading', { name: 'Đã nhập 2 nhân viên' })).toBeInTheDocument();
    expect(screen.getByText('Mã NV00025 – NV00026. Đã bỏ qua 2 dòng lỗi và 1 dòng đã có.')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Đã nhập 2 nhân viên.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem nhân viên vừa nhập' })).toHaveAttribute('href', '/employees?sort=newest&status=ALL');
    expect(api.checks).toEqual([{ size: 4096 }]);
    expect(api.imports).toEqual([{ skipInvalid: 'true', checksum: 'sha256:5f1c0d', size: 4096 }]);

    await userEvent.click(screen.getByRole('button', { name: 'Nhập file khác' }));
    expect(screen.getByText('Kéo thả file Excel vào đây')).toBeInTheDocument();
  });

  it('continues a file without errors and imports it without skipping', async () => {
    const { api } = open(importApi({ check: [cleanCheck()] }));
    await choose(xlsx());
    expect(await screen.findByText('2 dòng hợp lệ, sẵn sàng nhập')).toBeInTheDocument();
    expect(screen.getByText('File nhan-vien-moi.xlsx: 3 dòng. 1 dòng đã có sẽ được bỏ qua.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Hợp lệ/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 nhân viên' }));
    expect(await screen.findByRole('heading', { name: 'Đã nhập 2 nhân viên' })).toBeInTheDocument();
    expect(api.imports[0]).toMatchObject({ skipInvalid: 'false', checksum: 'sha256:5f1c0d' });
  });

  it('refuses a file that is not .xlsx or over 5 MB before sending it', async () => {
    const { api } = open();
    await choose(new File(['a;b'], 'nhan-vien.csv', { type: 'text/csv' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('File nhan-vien.csv không phải .xlsx. Nếu là .xls hoặc .csv, mở bằng Excel rồi Lưu thành “Excel Workbook (.xlsx)”.');
    await choose(xlsx('lon.xlsx', 5 * 1024 * 1024 + 1));
    expect(await screen.findByRole('alert')).toHaveTextContent('File 5 MB, vượt giới hạn 5 MB. Xóa các sheet và cột không cần rồi tải lên lại.');
    expect(api.checks).toEqual([]);
    expect(screen.getByRole('button', { name: 'Chọn file' })).toBeEnabled();
  });

  it.each([
    [{ status: 400, code: 'import.headers_invalid', extra: { missing: ['Số CCCD', 'Mã đơn vị'], found: ['Họ và tên', 'Ngày sinh'] } }, 'File không đúng mẫu: thiếu cột Số CCCD, Mã đơn vị. Tải file mẫu và chép dữ liệu sang, giữ nguyên dòng tiêu đề.'],
    [{ status: 400, code: 'import.too_many_rows', extra: { limit: 1000, found: 1204 } }, 'File có 1.204 dòng, vượt giới hạn 1.000 dòng mỗi lần. Chia thành nhiều file.'],
    [{ status: 400, code: 'import.file_invalid' }, 'Không đọc được file. File có thể bị hỏng hoặc đang đặt mật khẩu.'],
    [{ status: 400, code: 'import.empty' }, 'File chưa có dòng dữ liệu nào. Điền từ dòng 2, ngay dưới dòng tiêu đề.'],
    ['network' as const, 'Không kiểm tra được file. Kiểm tra kết nối rồi chọn lại file.'],
  ])('shows a refused file under the drop zone and stays on step 1 (%#)', async (refusal, message) => {
    open(importApi({ check: [refusal] }));
    await choose(xlsx());
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(within(screen.getByRole('list', { name: 'Các bước' })).getByText('Tải lên').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('goes back to the check with what changed when the import finds new errors', async () => {
    open(importApi({ check: [cleanCheck()], result: [{ status: 400, code: 'import.rows_invalid', extra: (({ summary, errors, rows }) => ({ summary, errors, rows }))(importCheck()) }] }));
    await choose(xlsx());
    await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 nhân viên' }));
    expect(await screen.findByText('Dữ liệu đã thay đổi từ lúc kiểm tra: 2 dòng có kết quả mới. Xem lại rồi xác nhận lần nữa.')).toBeInTheDocument();
    expect(screen.getByText('2 dòng có lỗi')).toBeInTheDocument();
    expect(within(await rowOf(4)).getByText('Mới')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bỏ qua 2 dòng lỗi, tiếp tục' })).toBeInTheDocument();
  });

  it('stays on the confirmation with "Thử lại" when the write fails, and retries', async () => {
    const { api } = open(importApi({ result: [{ status: 500, code: 'internal' }, importResult()] }));
    await choose(xlsx());
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua 2 dòng lỗi, tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 nhân viên' }));
    expect(await screen.findByText('Chưa nhập nhân viên nào')).toBeInTheDocument();
    expect(screen.getByText('Không có dữ liệu nào được ghi. Kiểm tra kết nối rồi bấm Thử lại.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: 'Đã nhập 2 nhân viên' })).toBeInTheDocument();
    expect(api.imports).toHaveLength(2);
  });

  it('sends a changed file back to step 1', async () => {
    open(importApi({ result: [{ status: 409, code: 'import.file_changed' }] }));
    await choose(xlsx());
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua 2 dòng lỗi, tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 nhân viên' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('File đã thay đổi từ lúc kiểm tra, nên chưa nhập nhân viên nào. Chọn lại file để kiểm tra lần nữa.');
    expect(screen.getByText('Kéo thả file Excel vào đây')).toBeInTheDocument();
  });

  it('says when every row already exists, and still shows them on request', async () => {
    const check = importCheck();
    const existing = { ...check, summary: { totalRows: 1, validRows: 0, errorRows: 0, existingRows: 1 }, errors: [], rows: check.rows.filter((row) => row.status === 'EXISTING') };
    open(importApi({ check: [existing] }));
    await choose(xlsx());
    expect(await screen.findByRole('heading', { name: 'Tất cả 1 nhân viên trong file đã có' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về danh sách nhân viên' })).toHaveAttribute('href', '/employees');
    await userEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    expect(await rowOf(5)).toHaveTextContent('Trùng Số CCCD với hồ sơ Trần Thị Mai (NV00003).');
    expect(screen.queryByRole('button', { name: /Tiếp tục/ })).not.toBeInTheDocument();
  });

  it('asks before leaving a check, and "Hủy" stops a check that runs', async () => {
    const { router } = open(importApi({ delayMs: 200 }));
    await choose(xlsx());
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy' }));
    expect(screen.getByText('Kéo thả file Excel vào đây')).toBeInTheDocument();

    await choose(xlsx());
    await screen.findByText('2 dòng có lỗi');
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Nhân viên' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ lần nhập này?' });
    expect(dialog).toHaveTextContent(`Kết quả kiểm tra file ${IMPORT_FILE_NAME} sẽ mất. Chưa có nhân viên nào được thêm.`);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ở lại' }));
    expect(router.state.location.pathname).toBe('/employees/import');
    expect(screen.getByText('2 dòng có lỗi')).toBeInTheDocument();
  });

  it('shows the no-permission state when the API refuses the check', async () => {
    open(importApi({ check: [{ status: 403, code: 'auth.forbidden' }] }));
    await choose(xlsx());
    expect(await screen.findByRole('heading', { name: 'Bạn không nhập được nhân viên' })).toBeInTheDocument();
  });
});
