import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { COMPANY, companyApi, LOGO_URL } from '@/test/company-handlers';
import { ADMIN_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const LOGO_ALT = `Logo ${COMPANY.name}`;
const openPage = () => renderRoutes(routes, { session: ADMIN_ACCOUNT, path: '/company' });
const png = (name = 'logo.png', bytes = 2048) => new File([new Uint8Array(bytes)], name, { type: 'image/png' });
const fileInput = (label: string) => screen.findByLabelText(label, { selector: 'input' });
/** The logo in the header: decorative next to the company name, so it has no accessible name. */
const headerLogo = () => within(screen.getByRole('banner')).queryByRole('presentation');
// `applyAccept: false`: the user may pick any file ("All files" in the dialog, or drag and drop).
const user = () => userEvent.setup({ applyAccept: false });

describe('CompanyPage: logo', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('uploads a logo as multipart field "file" and updates the header mark at once', async () => {
    const api = companyApi();
    server.use(...api.handlers);
    openPage();
    expect(await screen.findByRole('button', { name: 'Tải logo lên' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa logo' })).not.toBeInTheDocument();
    expect(headerLogo()).not.toBeInTheDocument();

    await user().upload(await fileInput('Tải logo lên'), png());

    expect(await within(toastRegion()).findByText('Đã cập nhật logo công ty')).toBeInTheDocument();
    expect(api.uploads.map((file) => [file.type, file.size])).toEqual([['image/png', 2048]]);
    const logoUrl = api.current().logoUrl!;
    expect(screen.getByRole('img', { name: LOGO_ALT })).toHaveAttribute('src', logoUrl);
    expect(headerLogo()).toHaveAttribute('src', logoUrl);
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa logo' })).toBeInTheDocument();
  });

  it('rejects a file over 1 MB before uploading and keeps the current logo', async () => {
    const api = companyApi({ logoUrl: LOGO_URL });
    server.use(...api.handlers);
    openPage();
    await user().upload(await fileInput('Đổi logo'), png('logo-moi.png', Math.round(2.4 * 1024 * 1024)));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp logo-moi.png nặng 2,4 MB, vượt quá 1 MB. Chọn ảnh nhỏ hơn hoặc nén ảnh rồi tải lại.');
    expect(api.uploads).toEqual([]);
    expect(screen.getByRole('img', { name: LOGO_ALT })).toHaveAttribute('src', LOGO_URL);
    expect(headerLogo()).toHaveAttribute('src', LOGO_URL);
  });

  it('writes the file size in the UI language', async () => {
    await i18n.changeLanguage('en');
    server.use(...companyApi({ logoUrl: LOGO_URL }).handlers);
    openPage();
    await user().upload(await fileInput('Replace logo'), png('new-logo.png', Math.round(2.4 * 1024 * 1024)));
    expect(await screen.findByRole('alert')).toHaveTextContent('new-logo.png is 2.4 MB, over the 1 MB limit.');
  });

  it('rejects a file that is not PNG, JPEG or WebP before uploading', async () => {
    const api = companyApi({ logoUrl: LOGO_URL });
    server.use(...api.handlers);
    openPage();
    await user().upload(await fileInput('Đổi logo'), new File(['%PDF'], 'logo.pdf', { type: 'application/pdf' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp logo.pdf không phải ảnh PNG, JPEG hoặc WebP. Chọn tệp khác.');
    expect(api.uploads).toEqual([]);
    expect(screen.getByRole('img', { name: LOGO_ALT })).toHaveAttribute('src', LOGO_URL);
  });

  it('shows the same message when the backend rejects the file (mislabeled image)', async () => {
    // Handlers listed first win.
    server.use(http.put('*/api/company/logo', () => problem(415, 'company.logo_unsupported_type')), ...companyApi({ logoUrl: LOGO_URL }).handlers);
    openPage();
    await user().upload(await fileInput('Đổi logo'), png('anh.png'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp anh.png không phải ảnh PNG, JPEG hoặc WebP. Chọn tệp khác.');
    expect(screen.getByRole('img', { name: LOGO_ALT })).toHaveAttribute('src', LOGO_URL);
    expect(toastRegion()).toBeEmptyDOMElement();
  });

  it('disables the buttons and says so while the logo uploads; a failed upload asks to try again', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.put('*/api/company/logo', async () => {
        await held;
        return HttpResponse.error();
      }),
      ...companyApi({ logoUrl: LOGO_URL }).handlers,
    );
    openPage();
    await user().upload(await fileInput('Đổi logo'), png());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đang tải logo lên…'));
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xóa logo' })).toBeDisabled();
    release();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được logo lên. Kiểm tra kết nối mạng rồi thử lại.');
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toHaveAccessibleDescription('Không tải được logo lên. Kiểm tra kết nối mạng rồi thử lại.');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('removes the logo only after the confirm dialog', async () => {
    const api = companyApi({ logoUrl: LOGO_URL });
    server.use(...api.handlers);
    openPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa logo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa logo công ty?' });
    expect(dialog).toHaveAccessibleDescription(/Logo sẽ không còn hiển thị trên thanh đầu trang, hợp đồng, phiếu lương và báo cáo\./);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.current().logoUrl).toBe(LOGO_URL);
    // Cancelled: focus returns to the button that opened the dialog.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xóa logo' })).toHaveFocus());

    await userEvent.click(screen.getByRole('button', { name: 'Xóa logo' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xóa logo' }));
    expect(await within(toastRegion()).findByText('Đã xóa logo công ty')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('img', { name: LOGO_ALT })).not.toBeInTheDocument();
    expect(headerLogo()).not.toBeInTheDocument();
    // The remove button is gone; focus lands on the upload button, not on <body>.
    expect(screen.queryByRole('button', { name: 'Xóa logo' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tải logo lên' })).toHaveFocus());
  });

  it('does not treat a logo change as an unsaved change of the form', async () => {
    server.use(...companyApi().handlers);
    openPage();
    await user().upload(await fileInput('Tải logo lên'), png());
    await within(toastRegion()).findByText('Đã cập nhật logo công ty');
    expect(screen.getByRole('button', { name: 'Lưu thông tin' })).toBeDisabled();
    await userEvent.click(screen.getByRole('link', { name: 'Tổng quan' }));
    expect(await screen.findByRole('heading', { level: 1, name: /^Chào buổi (sáng|chiều|tối), / })).toBeInTheDocument();
  });
});
