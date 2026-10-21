import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import i18n from '@/i18n';
import { ADMIN_ACCOUNT, EMPLOYEE_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const original = { CONTRACT: 30, PROBATION: 14, VISA: 60, WORK_PERMIT: 60, CERTIFICATE: 30 };
function open(session = ADMIN_ACCOUNT) {
  const saved: unknown[] = [];
  server.use(
    http.get('*/api/expiry/settings', () => HttpResponse.json({ advanceDays: original, canEdit: session.permissions.includes('COMPANY_EDIT') })),
    http.put('*/api/expiry/settings', async ({ request }) => {
      const body = await request.json() as { advanceDays: typeof original };
      saved.push(body);
      return HttpResponse.json({ ...body, canEdit: true });
    }),
  );
  return { saved, ...renderRoutes(routes, { session, path: '/expiry/settings' }) };
}

describe('Expiry warning settings', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('validates integer bounds, focuses the invalid field, saves all five and confirms success', async () => {
    const { saved } = open();
    const visa = await screen.findByRole('textbox', { name: 'Visa' }, { timeout: 10000 });
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getByRole('link', { name: 'Mốc cảnh báo sắp hết hạn' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: /^Sắp hết hạn$/ })).not.toHaveAttribute('aria-current');
    expect(visa).toHaveValue('60');
    await userEvent.clear(visa);
    await userEvent.type(visa, '366');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mốc cảnh báo' }));
    expect(await screen.findByText('Nhập số nguyên từ 0 đến 365 ngày.')).toBeInTheDocument();
    await waitFor(() => expect(visa).toHaveFocus());
    expect(visa).toHaveAccessibleDescription('Nhập số nguyên từ 0 đến 365 ngày.');
    expect(saved).toHaveLength(0);
    await userEvent.clear(visa);
    await userEvent.type(visa, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mốc cảnh báo' }));
    expect(await within(toastRegion()).findByText('Đã lưu mốc cảnh báo.')).toBeInTheDocument();
    expect(saved).toEqual([{ advanceDays: { ...original, VISA: 0 } }]);
    expect(screen.getByRole('button', { name: 'Lưu mốc cảnh báo' })).toBeDisabled();
  });

  it('guards unsaved edits on navigation and supports discard', async () => {
    const { router } = open();
    const contract = await screen.findByRole('textbox', { name: 'Hợp đồng' });
    await userEvent.type(contract, '1');
    await userEvent.click(screen.getByRole('link', { name: 'Về danh sách sắp hết hạn' }));
    expect(await screen.findByRole('dialog', { name: 'Rời trang và bỏ thay đổi chưa lưu?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(router.state.location.pathname).toBe('/expiry/settings');
    await userEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }));
    expect(contract).toHaveValue('30');
    await waitFor(() => expect(contract).toHaveFocus());
  });

  it('permits a company reader to inspect but not save', async () => {
    open(EMPLOYEE_ACCOUNT);
    expect(await screen.findByRole('textbox', { name: 'Visa' })).toBeDisabled();
    expect(screen.getByText('Bạn có thể xem nhưng không có quyền sửa mốc cảnh báo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu mốc cảnh báo' })).not.toBeInTheDocument();
  });

  it('denies callers lacking company view without requesting settings', async () => {
    let calls = 0;
    server.use(http.get('*/api/expiry/settings', () => { calls++; return HttpResponse.json({ advanceDays: original, canEdit: false }); }));
    renderRoutes(routes, { session: { ...EMPLOYEE_ACCOUNT, permissions: [] }, path: '/expiry/settings' });
    expect(screen.getByText('Bạn không có quyền xem mốc cảnh báo')).toBeInTheDocument();
    await waitFor(() => expect(calls).toBe(0));
  });
});
