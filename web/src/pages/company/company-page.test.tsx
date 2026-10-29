import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { COMPANY, companyApi, LOGO_URL } from '@/test/company-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const openPage = (session = ADMIN_ACCOUNT) => renderRoutes(routes, { session, path: '/company' });
const nameField = () => screen.findByRole('textbox', { name: /Tên công ty/ });
const taxCodeField = () => screen.getByRole('textbox', { name: 'Mã số thuế' });
const save = () => screen.getByRole('button', { name: 'Lưu thông tin' });
const header = () => screen.getByRole('banner');

describe('CompanyPage: company information', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows skeletons while loading, then the saved values with nothing to save', async () => {
    server.use(...companyApi().handlers);
    openPage();
    expect(screen.getByRole('region', { name: 'Đang tải thông tin công ty' })).toHaveAttribute('aria-busy', 'true');
    expect(await nameField()).toHaveValue(COMPANY.name);
    expect(taxCodeField()).toHaveValue('0312345678');
    expect(screen.getByRole('textbox', { name: 'Địa chỉ' })).toHaveValue(COMPANY.address);
    const representative = screen.getByRole('group', { name: 'Người đại diện theo pháp luật' });
    expect(within(representative).getByRole('textbox', { name: 'Họ và tên' })).toHaveValue('Phạm Quốc Bảo');
    expect(within(representative).getByRole('textbox', { name: 'Chức danh' })).toHaveValue('Giám đốc');
    expect(screen.getByText(/^Cập nhật lần cuối \d{2}:\d{2} · \d{2}\/10\/2026$/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Hủy thay đổi' })).not.toBeInTheDocument();
  });

  it('lets the Admin edit and save: toast, pristine again, header name updated', async () => {
    const api = companyApi();
    server.use(...api.handlers);
    openPage();
    const name = await nameField();
    await userEvent.clear(name);
    await userEvent.type(name, '  Công ty TNHH Phần mềm Mẫu ');
    await userEvent.clear(taxCodeField());
    await userEvent.click(save());

    expect(await within(toastRegion()).findByText('Đã lưu thông tin công ty')).toBeInTheDocument();
    expect(api.updates).toEqual([
      { name: 'Công ty TNHH Phần mềm Mẫu', taxCode: null, address: COMPANY.address, legalRepresentativeName: 'Phạm Quốc Bảo', legalRepresentativeTitle: 'Giám đốc' },
    ]);
    expect(name).toHaveValue('Công ty TNHH Phần mềm Mẫu');
    expect(save()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Hủy thay đổi' })).not.toBeInTheDocument();
    expect(within(header()).getByText('Công ty TNHH Phần mềm Mẫu')).toBeInTheDocument();
  });

  it('discards changes back to the saved values without asking', async () => {
    server.use(...companyApi().handlers);
    openPage();
    const name = await nameField();
    await userEvent.type(taxCodeField(), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }));
    expect(taxCodeField()).toHaveValue('0312345678');
    expect(name).toHaveValue(COMPANY.name);
    expect(save()).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The discard button is gone; focus is on the first field, not lost.
    expect(screen.queryByRole('button', { name: 'Hủy thay đổi' })).not.toBeInTheDocument();
    expect(name).toHaveFocus();
  });

  it('shows field errors, focuses the first invalid field and does not call the API', async () => {
    const api = companyApi();
    server.use(...api.handlers);
    openPage();
    const name = await nameField();
    await userEvent.clear(name);
    await userEvent.clear(taxCodeField());
    await userEvent.type(taxCodeField(), '031234567');
    await userEvent.click(save());

    expect(await screen.findByText('Nhập tên công ty.')).toBeInTheDocument();
    expect(name).toBeInvalid();
    expect(name).toHaveFocus();
    expect(taxCodeField()).toHaveAccessibleDescription('Mã số thuế phải có 10 chữ số, hoặc 10 chữ số kèm "-" và 3 chữ số (ví dụ 0312345678-001).');
    expect(api.updates).toEqual([]);
  });

  it('validates a field when the user leaves it and accepts a tax code with a branch code', async () => {
    server.use(...companyApi().handlers);
    openPage();
    await nameField();
    await userEvent.clear(taxCodeField());
    await userEvent.type(taxCodeField(), '0312345678-01');
    await userEvent.tab();
    expect(await screen.findByText(/Mã số thuế phải có 10 chữ số/)).toBeInTheDocument();
    await userEvent.type(taxCodeField(), '1');
    await waitFor(() => expect(taxCodeField()).not.toBeInvalid());
  });

  it('maps backend field errors to the same messages', async () => {
    // Handlers listed first win.
    server.use(
      http.put('*/api/company', () => problem(400, 'validation.invalid', { errors: [{ field: 'taxCode', code: 'Pattern' }] })),
      ...companyApi().handlers,
    );
    openPage();
    await userEvent.type(await nameField(), ' 2');
    await userEvent.click(save());
    await waitFor(() => expect(taxCodeField()).toBeInvalid());
    expect(taxCodeField()).toHaveAccessibleDescription(/Mã số thuế phải có 10 chữ số/);
    expect(taxCodeField()).toHaveFocus();
    expect(toastRegion()).toBeEmptyDOMElement();
  });

  it('keeps the values and shows a lasting toast when saving fails', async () => {
    server.use(http.put('*/api/company', () => HttpResponse.error()), ...companyApi().handlers);
    openPage();
    const name = await nameField();
    await userEvent.type(name, ' 2');
    await userEvent.click(save());
    const toast = await screen.findByRole('alert');
    expect(toast).toHaveTextContent('Không lưu được thông tin công ty');
    expect(toast).toHaveTextContent('Kiểm tra kết nối mạng rồi thử lại.');
    expect(name).toHaveValue(`${COMPANY.name} 2`);
    expect(save()).toBeEnabled();
    await userEvent.click(within(toast).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks before leaving the page with unsaved changes', async () => {
    server.use(...companyApi().handlers);
    openPage();
    await userEvent.type(await nameField(), ' 2');
    await userEvent.click(screen.getByRole('link', { name: 'Tổng quan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rời trang và bỏ thay đổi chưa lưu?' });
    expect(dialog).toHaveAccessibleDescription('Các thay đổi ở Thông tin công ty chưa được lưu sẽ bị mất.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(await nameField()).toHaveValue(`${COMPANY.name} 2`);
    // Staying: focus returns to the link that asked to leave.
    await waitFor(() => expect(screen.getByRole('link', { name: 'Tổng quan' })).toHaveFocus());

    await userEvent.click(screen.getByRole('link', { name: 'Tổng quan' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Rời trang' }));
    expect(await screen.findByRole('heading', { level: 1, name: /^Chào buổi (sáng|chiều|tối), / })).toBeInTheDocument();
  });

  it('shows the denied state to an Account without COMPANY_EDIT', async () => {
    openPage(HR_ACCOUNT);
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền xem Thông tin công ty' })).toBeInTheDocument();
    expect(screen.getByText('Liên hệ quản trị viên nếu bạn cần quyền này.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Tên công ty/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thông tin' })).not.toBeInTheDocument();
    // The shell still shows which company this is.
    expect(await within(header()).findByText(COMPANY.name)).toBeInTheDocument();
  });

  it('shows the load error with a retry, and the fallback tile alone in the header', async () => {
    let fail = true;
    server.use(http.get('*/api/company', () => (fail ? problem(500, 'unknown') : HttpResponse.json(COMPANY))));
    openPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không tải được thông tin công ty');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(header()).queryByText(COMPANY.name)).not.toBeInTheDocument();
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await nameField()).toHaveValue(COMPANY.name);
  });

  it('shows the page in English', async () => {
    await i18n.changeLanguage('en');
    server.use(...companyApi({ logoUrl: LOGO_URL }).handlers);
    openPage();
    expect(await screen.findByRole('textbox', { name: /Company name/ })).toHaveValue(COMPANY.name);
    expect(screen.getByRole('heading', { level: 1, name: 'Company profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save information' })).toBeDisabled();
    expect(screen.getByRole('img', { name: `${COMPANY.name} logo` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace logo' })).toBeInTheDocument();
  });
});
