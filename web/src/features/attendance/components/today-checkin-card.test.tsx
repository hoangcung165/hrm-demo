import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalApi } from '@/test/approval-handlers';
import { stubObjectUrls } from '@/test/device-stubs';
import { AN_ID } from '@/test/leave-fixtures';
import { leaveApi } from '@/test/leave-handlers';
import { ACCEPTED, checkinApi, machinePunch, mobilePunch, type CheckinApiOptions } from '@/test/mobile-checkin-handlers';
import { notificationApi } from '@/test/notification-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const AN: Account = { ...EMPLOYEE_ACCOUNT, fullName: 'Nguyễn Văn An', employeeId: AN_ID };
// 10:00 on 04/11/2026 on the company's clock, whatever the zone of the machine.
const MORNING = new Date('2026-11-04T03:00:00Z');
const card = () => screen.findByRole('region', { name: 'Chấm công hôm nay' });
let urls: ReturnType<typeof stubObjectUrls>;

function open(options: CheckinApiOptions = {}, session: Account = AN) {
  const api = checkinApi(options);
  server.use(...api.handlers, ...notificationApi().handlers, ...leaveApi().handlers, ...approvalApi().handlers);
  return { api, ...renderRoutes(routes, { session, path: '/' }) };
}

describe('Chấm công hôm nay', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
    vi.useFakeTimers({ toFake: ['Date'], now: MORNING });
    urls = stubObjectUrls();
  });
  afterEach(() => vi.useRealTimers());

  it('before the first punch: the shift, "Chưa chấm công" and the way in to check in', async () => {
    open();
    const region = await card();
    await within(region).findByText('Chưa chấm công');
    expect(region).toHaveTextContent('Hành chính 08:00 – 17:00');
    expect(within(region).getByRole('link', { name: 'Chấm công vào' })).toHaveAttribute('href', '/checkin');
    expect(region).toHaveTextContent('Cần vị trí và một ảnh chụp. Giờ ghi nhận là giờ máy chủ.');
    expect(within(region).queryByRole('list', { name: 'Lần quẹt hôm nay' })).not.toBeInTheDocument();
  });

  it('after checking in: "Đã vào", the punch with its place and zone, and "Chấm công ra"', async () => {
    open({ consent: ACCEPTED, punches: [mobilePunch('p1', '2026-11-04T08:02:41+07:00')] });
    const region = await card();
    await within(region).findByText('Đã vào');
    const punches = within(region).getAllByRole('listitem');
    expect(punches).toHaveLength(1);
    expect(punches[0]).toHaveTextContent('08:02 Vào');
    expect(punches[0]).toHaveTextContent('Văn phòng chính · cách 35 m');
    expect(within(punches[0]!).getByText('Trong vùng')).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Chấm công ra' })).toHaveAttribute('href', '/checkin');
  });

  it('a phone punch outside the zone or with a poor reading is marked and will be reviewed', async () => {
    open({ consent: ACCEPTED, punches: [mobilePunch('p1', '2026-11-04T08:11:00+07:00', { outside: true, lowAccuracy: true })] });
    const region = await card();
    const punch = await within(region).findByRole('listitem');
    expect(punch).toHaveTextContent('Văn phòng chính · cách 1,2 km');
    expect(within(punch).getByText('Ngoài vùng')).toBeInTheDocument();
    expect(within(punch).getByText('Sai số lớn')).toBeInTheDocument();
    expect(region).toHaveTextContent('Quản lý trực tiếp sẽ xem lại lần quẹt có đánh dấu.');
  });

  it('a machine punch says where it came from, with no zone; In then Out', async () => {
    open({ consent: ACCEPTED, punches: [machinePunch('p1', '2026-11-04T07:58:00+07:00'), mobilePunch('p2', '2026-11-04T17:06:00+07:00')] });
    const region = await card();
    await within(region).findByText('Đã ra');
    const [first, second] = within(region).getAllByRole('listitem');
    expect(first).toHaveTextContent('07:58 Vào');
    expect(first).toHaveTextContent('Máy chấm công');
    expect(within(first!).queryByText('Trong vùng')).not.toBeInTheDocument();
    expect(second).toHaveTextContent('17:06 Ra');
  });

  it('names the day while yesterday\'s night shift is still open', async () => {
    open({ consent: ACCEPTED, today: { date: '2026-11-03', shift: { id: 'sh-d', code: 'DEM', name: 'Ca đêm', startTime: '22:00', endTime: '06:00', crossesMidnight: true, active: true } } });
    const region = await card();
    await within(region).findByText('Chưa chấm công');
    expect(region).toHaveTextContent('Ca đêm 22:00 – 06:00 · 03/11');
  });

  it('says so when there is no shift today', async () => {
    open({ today: { shift: null } });
    const region = await card();
    await within(region).findByText('Hôm nay không có ca');
  });

  it('opens the check-in, which asks for the consent first', async () => {
    const user = userEvent.setup();
    const { router } = open();
    const region = await card();
    await user.click(await within(region).findByRole('link', { name: 'Chấm công vào' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkin'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Trước lần chấm công đầu tiên' })).toBeInTheDocument();
  });

  it('a phone punch has a button for its photo; the photo is read only when it is tapped, each time', async () => {
    const user = userEvent.setup();
    const { api } = open({ consent: ACCEPTED, punches: [mobilePunch('p1', '2026-11-04T08:02:41+07:00')] });
    const button = await within(await card()).findByRole('button', { name: 'Xem ảnh lần quẹt lúc 08:02' });
    expect(api.photoViews).toEqual([]);
    await user.click(button);
    const dialog = await screen.findByRole('dialog', { name: 'Ảnh lần quẹt lúc 08:02' });
    expect(dialog).toHaveTextContent('Mỗi lần xem ảnh đều được ghi lại.');
    expect(await within(dialog).findByRole('img', { name: 'Ảnh chấm công lúc 08:02' })).toHaveAttribute('src', expect.stringMatching(/^blob:/));
    expect(api.photoViews).toEqual(['p1']);
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(urls.revoked).toHaveLength(1);
    await user.click(button);
    await screen.findByRole('img', { name: 'Ảnh chấm công lúc 08:02' });
    expect(api.photoViews).toEqual(['p1', 'p1']);
  });

  it('says so when the photo cannot be loaded', async () => {
    const user = userEvent.setup();
    open({ consent: ACCEPTED, punches: [mobilePunch('p1', '2026-11-04T08:02:41+07:00')], failPhoto: true });
    await user.click(await within(await card()).findByRole('button', { name: 'Xem ảnh lần quẹt lúc 08:02' }));
    expect(await within(await screen.findByRole('dialog')).findByRole('alert')).toHaveTextContent('Chưa tải được ảnh.');
  });

  it('a machine punch has no photo button', async () => {
    open({ consent: ACCEPTED, punches: [machinePunch('p1', '2026-11-04T07:58:00+07:00')] });
    const region = await card();
    await within(region).findByText('Máy chấm công');
    expect(within(region).queryByRole('button', { name: /^Xem ảnh/ })).not.toBeInTheDocument();
  });

  it('a failed read can be tried again', async () => {
    const user = userEvent.setup();
    open({ failToday: true });
    const region = await card();
    expect(await within(region).findByRole('alert')).toHaveTextContent('Chưa tải được thông tin chấm công hôm nay.');
    server.use(...checkinApi().handlers);
    await user.click(within(region).getByRole('button', { name: 'Thử lại' }));
    await within(region).findByText('Chưa chấm công');
  });

  it('is not shown to an Employee who cannot check in (403) nor to an Account without an Employee', async () => {
    const { api } = open({ forbidden: true });
    await screen.findByRole('list', { name: 'Lối tắt' });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Chấm công hôm nay' })).not.toBeInTheDocument());
    expect(api.accepts).toHaveLength(0);
  });

  it('is on the home of every Employee, an HR one too', async () => {
    open({}, { ...HR_ACCOUNT, employeeId: '55555555-5555-4555-8555-555555555555' });
    const region = await card();
    await within(region).findByRole('link', { name: 'Chấm công vào' });
  });
});

describe('Chấm công hôm nay without an Employee', () => {
  it('is not on the home of an Account without an Employee', async () => {
    await i18n.changeLanguage('vi');
    renderRoutes(routes, { session: HR_ACCOUNT, path: '/' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('region', { name: 'Chấm công hôm nay' })).not.toBeInTheDocument();
  });
});
