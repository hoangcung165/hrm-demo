import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { dailyApi, dayDetail, mobileDailyData, mobileDayDetail, type DailyApi, type DailyApiOptions } from '@/test/attendance-daily-handlers';
import { stubObjectUrls } from '@/test/device-stubs';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'ATTENDANCE_VIEW', 'ATTENDANCE_IMPORT'] };
const WEEK = '/attendance?from=2026-10-12&to=2026-10-18';
const PHONE = 'Chấm công bằng điện thoại';
const MANH = 'Lưu Đức Mạnh';

function open(options: Partial<DailyApiOptions> = {}): { api: DailyApi } {
  const api = dailyApi({ list: mobileDailyData(), detail: mobileDayDetail(), ...options });
  server.use(...api.handlers);
  renderRoutes(routes, { session: HR, path: WEEK });
  return { api };
}

/** Opens the drawer of the night of 13/10, the example of the #39 artboards. */
async function openDay() {
  await userEvent.click(await screen.findByRole('button', { name: `Chi tiết ngày T3 13/10 của ${MANH}` }));
  const drawer = await screen.findByRole('dialog', { name: /13\/10\/2026/ });
  await within(drawer).findByText('Lần quẹt 2');
  return drawer;
}

describe('Công theo ngày: lần quẹt điện thoại (HRM-39/FE-3)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
    stubObjectUrls();
  });

  it('puts a phone icon beside a time made by phone, and the Ngoài vùng mark on the day', async () => {
    open();
    const list = await screen.findByRole('table', { name: /^Công theo ngày từ/ });
    const night = within(list).getAllByRole('row')[2]!;
    // In and Out of the 13/10 are both phone punches; the 14/10 has machine punches only and no icon.
    expect(within(night).getAllByRole('img', { name: PHONE })).toHaveLength(2);
    expect(night).toHaveTextContent('21:54');
    expect(night).toHaveTextContent('06:07ngày 14/10');
    expect(within(night).getByText('Ngoài vùng')).toBeInTheDocument();
    expect(within(within(list).getAllByRole('row')[3]!).queryByRole('img', { name: PHONE })).not.toBeInTheDocument();
  });

  it('shows a poor reading as Sai số lớn, beside Ngoài vùng', async () => {
    const data = mobileDailyData();
    data.rows[0]!.days[0]!.flags = ['OUTSIDE_LOCATION', 'LOW_ACCURACY'];
    open({ list: data });
    const night = within(await screen.findByRole('table', { name: /^Công theo ngày từ/ })).getAllByRole('row')[2]!;
    expect(within(night).getByText('Ngoài vùng')).toBeInTheDocument();
    expect(within(night).getByText('Sai số lớn')).toBeInTheDocument();
  });

  it('puts the phone icon in the caption of a day at 390', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));
    try {
      open();
      const agenda = await screen.findByRole('list', { name: /^Công theo ngày từ/ });
      const day = within(agenda).getAllByRole('listitem')[1]!;
      expect(day).toHaveTextContent('Ca đêm · 21:54 → 06:07 · 8:00');
      expect(within(day).getByRole('img', { name: PHONE })).toBeInTheDocument();
      expect(within(day).getByText('Ngoài vùng')).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('lists each phone punch in the drawer with its place, distance, accuracy, zone and a map link', async () => {
    open();
    const drawer = await openDay();
    const [first, second] = within(drawer).getAllByRole('listitem');
    expect(first).toHaveTextContent('21:54:12');
    expect(first).toHaveTextContent('Điện thoại');
    expect(first).toHaveTextContent('Trung tâm dữ liệu Hòa Lạc · cách 60 m');
    expect(first).toHaveTextContent('Sai số vị trí 14 m');
    expect(within(first!).getByText('Trong vùng')).toBeInTheDocument();
    expect(second).toHaveTextContent('Trung tâm dữ liệu Hòa Lạc · cách 1,4 km');
    expect(within(second!).getByText('Ngoài vùng')).toBeInTheDocument();
    const map = within(second!).getByRole('link', { name: /^Xem trên bản đồ/ });
    expect(map).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=21.02216,105.529');
    expect(map).toHaveAttribute('target', '_blank');
    expect(map).toHaveAttribute('rel', 'noopener noreferrer');
    expect(map).toHaveAccessibleName('Xem trên bản đồ (mở trong tab mới)');
  });

  it('says the photos are scoped and viewed on record, and that a flagged punch is only for review', async () => {
    open();
    const drawer = await openDay();
    expect(within(drawer).getByText(/chỉ người có quyền với nhân viên này xem được. Mỗi lần xem ảnh đều được ghi vào Audit log/)).toBeInTheDocument();
    expect(within(drawer).getByText(/chỉ để xem lại, giờ vào ra không đổi. Nếu lần quẹt sai, nhân viên gửi Đơn bổ sung công/)).toBeInTheDocument();
  });

  it('names Sai số lớn on the punch and a place that is no longer in use', async () => {
    open({ detail: mobileDayDetail({ lowAccuracy: true, placeActive: false }) });
    const drawer = await openDay();
    const second = within(drawer).getAllByRole('listitem')[1]!;
    expect(second).toHaveTextContent('Sai số vị trí 180 m');
    expect(within(second).getByText('Sai số lớn')).toBeInTheDocument();
    expect(second).toHaveTextContent('Trung tâm dữ liệu Hòa Lạc (đã ngừng dùng) · cách 1,4 km');
  });

  it('reads a photo only when it is tapped, once for each opening, and Esc closes the photo before the drawer', async () => {
    const user = userEvent.setup();
    const { api } = open();
    const drawer = await openDay();
    // Opening the day read no photo: each read is one Audit log record.
    expect(api.photoViews).toEqual([]);
    await user.click(within(drawer).getByRole('button', { name: 'Xem ảnh lần quẹt lúc 06:07' }));
    const photo = await screen.findByRole('dialog', { name: 'Ảnh lần quẹt lúc 06:07' });
    expect(within(photo).getByText('Mỗi lần xem ảnh đều được ghi lại.')).toBeInTheDocument();
    expect(await within(photo).findByRole('img', { name: 'Ảnh chấm công lúc 06:07' })).toHaveAttribute('src', expect.stringMatching(/^blob:/));
    expect(api.photoViews).toEqual(['mp-out']);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ảnh lần quẹt lúc 06:07' })).not.toBeInTheDocument());
    // The drawer is still open and focus is back on the button that opened the photo.
    expect(screen.getByRole('dialog', { name: /13\/10\/2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem ảnh lần quẹt lúc 06:07' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Xem ảnh lần quẹt lúc 06:07' }));
    await screen.findByRole('img', { name: 'Ảnh chấm công lúc 06:07' });
    expect(api.photoViews).toEqual(['mp-out', 'mp-out']);
  });

  it('says so when the API hides the photo because the person is out of scope', async () => {
    const user = userEvent.setup();
    open({ photoHidden: true });
    const drawer = await openDay();
    await user.click(within(drawer).getByRole('button', { name: 'Xem ảnh lần quẹt lúc 21:54' }));
    expect(await within(await screen.findByRole('dialog', { name: 'Ảnh lần quẹt lúc 21:54' })).findByRole('alert')).toHaveTextContent('Bạn không xem được ảnh này');
  });

  it('shows a machine punch as before: its machine, no place, no photo, no map', async () => {
    // The day of the machine punches of the other fixtures, opened from the same list.
    const api = dailyApi({ list: mobileDailyData(), detail: dayDetail() });
    server.use(...api.handlers);
    renderRoutes(routes, { session: HR, path: WEEK });
    await userEvent.click(await screen.findByRole('button', { name: `Chi tiết ngày T3 13/10 của ${MANH}` }));
    const drawer = await screen.findByRole('dialog', { name: /13\/10\/2026/ });
    await within(drawer).findByText('Lần quẹt 4');
    expect(within(drawer).getAllByText('Cổng chính')).toHaveLength(4);
    expect(within(drawer).queryByRole('link', { name: /bản đồ/ })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /^Xem ảnh/ })).not.toBeInTheDocument();
    expect(within(drawer).queryByText(/Mỗi lần xem ảnh/)).not.toBeInTheDocument();
  });

  it('reads in English', async () => {
    await i18n.changeLanguage('en');
    open();
    const night = within(await screen.findByRole('table', { name: /^Daily attendance for/ })).getAllByRole('row')[2]!;
    expect(within(night).getAllByRole('img', { name: 'Checked in by phone' })).toHaveLength(2);
    expect(within(night).getByText('Outside zone')).toBeInTheDocument();
  });
});
