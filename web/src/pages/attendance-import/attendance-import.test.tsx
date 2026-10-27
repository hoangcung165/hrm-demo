import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { cleanPunchCheck, PUNCH_FILE_NAME, punchCheck, punchImportApi, punchResult, storedPunchCheck, type PunchImportApi } from '@/test/attendance-import-handlers';
import { HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_VIEW', 'ATTENDANCE_IMPORT'] };
const csv = (name = PUNCH_FILE_NAME, bytes = 2048) => new File([new Uint8Array(bytes)], name, { type: 'text/csv' });

const open = (api: PunchImportApi = punchImportApi(), session: Account = HR) => {
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: '/attendance/import' }) };
};
// `applyAccept: false`: a file of any type can be dropped or picked with "All files".
const choose = async (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await userEvent.setup({ applyAccept: false }).upload(input, file);
};

describe('AttendanceImportPage: the wizard', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('checks a file at once, lists the errors by row, then imports the valid punches and skips the errors', async () => {
    const { api } = open(punchImportApi({ delayMs: 200 }));
    expect(await screen.findByText('Lần nhập gần đây')).toBeInTheDocument();
    expect(screen.getByText('log-tuan-41.csv')).toBeInTheDocument();
    expect(screen.getByText('(không có tên file)')).toBeInTheDocument();

    await choose(csv());
    expect(await screen.findByText('Đang kiểm tra file…')).toBeInTheDocument();
    expect(await screen.findByText('3 dòng lỗi', { selector: '*' })).toBeInTheDocument();
    // The stat tiles, then the error table with one tab per kind that occurs.
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Tất cả lỗi3', 'Không tìm thấy mã1', 'Thời gian1', 'Trùng trong file1']);
    const table = screen.getByRole('table', { name: `Các dòng lỗi của file ${PUNCH_FILE_NAME}` });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('4NV9999Không tìm thấy mã');
    expect(rows[0]).toHaveTextContent('Không có nhân viên nào có mã “NV9999”');
    expect(rows[1]).toHaveTextContent('31/13/2026 08:00');
    expect(rows[2]).toHaveTextContent('Lần quẹt này đã có ở dòng 3 của file');

    await userEvent.click(screen.getByRole('tab', { name: /Thời gian/ }));
    expect(within(screen.getByRole('table', { name: /Các dòng lỗi/ })).getAllByRole('row')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua 3 dòng lỗi, tiếp tục' }));
    expect(screen.getByText('5 lần quẹt của 3 nhân viên')).toBeInTheDocument();
    expect(screen.getByText('3 dòng lỗi, 1 lần quẹt đã nhập trước đó')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Nhập 5 lần quẹt' }));
    expect(await screen.findByRole('button', { name: 'Đang nhập 5 lần quẹt…' })).toBeDisabled();
    expect(await screen.findByRole('heading', { name: 'Đã nhập 5 lần quẹt' })).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Đã nhập 5 lần quẹt')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem công theo ngày' })).toHaveAttribute('href', '/attendance?from=2026-10-12&to=2026-10-13');
    expect(api.checks).toEqual([{ size: 2048 }]);
    expect(api.imports).toEqual([{ skipInvalid: 'true', checksum: 'sha256:a91c07', size: 2048 }]);

    await userEvent.click(screen.getByRole('button', { name: 'Nhập file khác' }));
    expect(screen.getByText('Chọn file log')).toBeInTheDocument();
  });

  it('continues a file without errors and imports it without skipping', async () => {
    const { api } = open(punchImportApi({ check: [cleanPunchCheck()], result: [punchResult(5)] }));
    await choose(csv());
    expect(await screen.findByText('Sẵn sàng nhập 5 lần quẹt')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /Các dòng lỗi/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 5 lần quẹt' }));
    await screen.findByRole('heading', { name: 'Đã nhập 5 lần quẹt' });
    expect(api.imports[0]).toMatchObject({ skipInvalid: 'false' });
  });

  it('shows that a file imported before has nothing new, with no import button', async () => {
    open(punchImportApi({ check: [storedPunchCheck()] }));
    await choose(csv());
    expect(await screen.findByText('File này đã được nhập: cả 6 lần quẹt đều đã có')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Nhập \d/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn file khác' }));
    expect(screen.getByText('Chọn file log')).toBeInTheDocument();
  });

  it('says nothing can be imported when every row has an error, and offers no import button', async () => {
    const all = { ...punchCheck(), summary: { ...punchCheck().summary, newPunches: 0, alreadyImported: 0, rowsRead: 3 } };
    open(punchImportApi({ check: [all] }));
    await choose(csv());
    expect(await screen.findByText('Không có lần quẹt nào để nhập')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tiếp tục/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn file khác' })).toBeInTheDocument();
  });

  it('refuses a file of the wrong type or size before sending it', async () => {
    const { api } = open();
    await choose(new File(['x'], 'log.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText(/không phải CSV hoặc Excel/)).toBeInTheDocument();
    await choose(csv('log-lon.csv', 5 * 1024 * 1024 + 1));
    expect(await screen.findByText(/lớn hơn mức tối đa 5 MB/)).toBeInTheDocument();
    expect(api.checks).toEqual([]);
  });

  it("shows the API's refusal of a file on step 1", async () => {
    open(punchImportApi({ check: [{ status: 422, code: 'import.headers_invalid' }] }));
    await choose(csv());
    expect(await screen.findByText(/Dòng tiêu đề không đúng/)).toBeInTheDocument();
    expect(screen.getByText('Chọn file log')).toBeInTheDocument();
  });

  it('keeps step 3 with "Thử lại" when the write fails, then succeeds', async () => {
    const { api } = open(punchImportApi({ check: [cleanPunchCheck()], result: ['network', punchResult(5)] }));
    await choose(csv());
    await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 5 lần quẹt' }));
    expect(await screen.findByText('Chưa nhập được log')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('heading', { name: 'Đã nhập 5 lần quẹt' });
    expect(api.imports).toHaveLength(2);
  });

  it('goes back to step 2 with the fresh result when the file changed since the check', async () => {
    const fresh = punchCheck();
    open(punchImportApi({ check: [cleanPunchCheck()], result: [{ status: 409, code: 'import.rows_invalid', extra: { summary: fresh.summary, errors: fresh.errors } }] }));
    await choose(csv());
    await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 5 lần quẹt' }));
    expect(await screen.findByText('File đã thay đổi từ lần kiểm tra trước')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bỏ qua 3 dòng lỗi, tiếp tục' })).toBeInTheDocument();
  });

  it('shows the denied state without ATTENDANCE_IMPORT and when the check answers 403', async () => {
    open(punchImportApi(), HR_ACCOUNT);
    expect(await screen.findByText('Bạn không có quyền nhập log quẹt thẻ')).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('turns into the denied state when the permission is taken away meanwhile', async () => {
    open(punchImportApi({ check: [{ status: 403, code: 'forbidden' }] }));
    await choose(csv());
    expect(await screen.findByText('Bạn không có quyền nhập log quẹt thẻ')).toBeInTheDocument();
  });

  it('hides the recent imports when they cannot be read', async () => {
    open(punchImportApi({ recent: { status: 500, code: 'server.error' } }));
    expect(await screen.findByText('Chọn file log')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Lần nhập gần đây')).not.toBeInTheDocument());
  });

  it('lists the same texts in English', async () => {
    await i18n.changeLanguage('en');
    open(punchImportApi({ check: [cleanPunchCheck()] }));
    await choose(csv());
    expect(await screen.findByText('Ready to import 5 punches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});
