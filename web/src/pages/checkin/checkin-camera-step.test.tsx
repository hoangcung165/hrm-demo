import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalApi } from '@/test/approval-handlers';
import { restoreDevices, stubDevices, stubObjectUrls, type DeviceOptions } from '@/test/device-stubs';
import { AN_ID } from '@/test/leave-fixtures';
import { leaveApi } from '@/test/leave-handlers';
import { ACCEPTED, checkinApi, LOW_ACCURACY_READING, mobilePunch, OUTSIDE_READING, type CheckinApiOptions } from '@/test/mobile-checkin-handlers';
import { notificationApi } from '@/test/notification-handlers';
import { EMPLOYEE_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

// The camera frame is drawn on a canvas, which jsdom does not have: the step gets a small JPEG instead.
vi.mock('@/lib/device-camera', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/device-camera')>()),
  captureFrame: vi.fn(async () => new Blob(['jpeg-bytes'], { type: 'image/jpeg' })),
}));

const AN: Account = { ...EMPLOYEE_ACCOUNT, fullName: 'Nguyễn Văn An', employeeId: AN_ID };
const SHUTTER_IN = 'Chụp ảnh và chấm công vào';

function open(options: CheckinApiOptions = {}, devices: DeviceOptions = {}, path = '/checkin') {
  const api = checkinApi({ consent: ACCEPTED, ...options });
  server.use(...api.handlers, ...notificationApi().handlers, ...leaveApi().handlers, ...approvalApi().handlers);
  const device = stubDevices(devices);
  return { api, device, ...renderRoutes(routes, { session: AN, path }) };
}

const shutter = (name = SHUTTER_IN) => screen.findByRole('button', { name });

describe('Chụp ảnh chấm công', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    stubObjectUrls();
  });
  afterEach(restoreDevices);

  it('reads nothing before the step: the card on Tổng quan opens no camera and asks for no position', async () => {
    const { device } = open({}, {}, '/');
    await screen.findByRole('region', { name: 'Chấm công hôm nay' });
    expect(device.getUserMedia).not.toHaveBeenCalled();
    expect(device.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('opens the front camera and reads the position when the step opens, and says where the phone is', async () => {
    const { api, device } = open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Chấm công vào' })).toBeInTheDocument();
    expect(await shutter()).toBeEnabled();
    expect(device.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false });
    expect(api.locates).toHaveLength(1);
    expect(Object.fromEntries(api.locates[0]!)).toEqual({ latitude: '21.031', longitude: '105.789', accuracyMeters: '12' });
    const chip = screen.getByRole('status', { name: '' });
    expect(chip).toHaveTextContent('Văn phòng chính · Trong vùng');
    expect(chip).toHaveTextContent('Cách 35 m · sai số 12 m');
    expect(screen.getByLabelText('Camera trước')).toBeInTheDocument();
    expect(screen.getByText(/Giờ ghi nhận là giờ máy chủ lúc nhận được lần quẹt/)).toBeInTheDocument();
  });

  it('one tap sends the photo and the reading, never a time, then shows the time and place and goes home', async () => {
    const user = userEvent.setup();
    const { api, device, router } = open();
    await user.click(await shutter());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.sends).toEqual([{ photoType: 'image/jpeg', photoSize: 10, latitude: '21.031', longitude: '105.789', accuracyMeters: '12', keys: ['photo', 'latitude', 'longitude', 'accuracyMeters'] }]);
    const toast = toastRegion();
    expect(toast).toHaveTextContent('Đã chấm công vào lúc 08:02');
    expect(toast).toHaveTextContent('Văn phòng chính · cách 35 m');
    // The home shows the punch, and the camera is closed with the step.
    const card = await screen.findByRole('region', { name: 'Chấm công hôm nay' });
    expect(await within(card).findByRole('link', { name: 'Chấm công ra' })).toBeInTheDocument();
    expect(device.track.stop).toHaveBeenCalled();
  });

  it('after a punch the step is a check-out', async () => {
    const user = userEvent.setup();
    open({ punches: [mobilePunch('p1', '2026-11-04T08:02:41+07:00')] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Chấm công ra' })).toBeInTheDocument();
    await user.click(await shutter('Chụp ảnh và chấm công ra'));
    expect(await within(toastRegion()).findByText('Đã chấm công ra lúc 08:02')).toBeInTheDocument();
  });

  it('with the location refused, says why, sends nothing and reads again when asked', async () => {
    const user = userEvent.setup();
    let position: 'denied' | 'ok' = 'denied';
    const { api, device } = open({}, { position: () => position });
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa đọc được vị trí');
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa có gì được lưu');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Chưa có vị trí');
    expect(await shutter()).toBeDisabled();
    expect(api.locates).toHaveLength(0);
    position = 'ok';
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('button', { name: SHUTTER_IN })).toBeEnabled());
    expect(device.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.sends).toHaveLength(0);
  });

  it('with no position available, says so in its own words', async () => {
    open({}, { position: 'unavailable' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa xác định được vị trí');
    expect(await shutter()).toBeDisabled();
  });

  it('with the camera refused, says why, sends nothing and opens it again when asked', async () => {
    const user = userEvent.setup();
    let camera: 'denied' | 'ok' = 'denied';
    const { api, device } = open({}, { camera: () => camera });
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa mở được camera');
    expect(await shutter()).toBeDisabled();
    camera = 'ok';
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('button', { name: SHUTTER_IN })).toBeEnabled());
    expect(device.getUserMedia).toHaveBeenCalledTimes(2);
    expect(api.sends).toHaveLength(0);
  });

  it('with a camera that another app holds, asks to close that app', async () => {
    open({}, { camera: 'busy' });
    expect(await screen.findByRole('alert')).toHaveTextContent('ứng dụng khác đang dùng nó');
  });

  it('a send that fails stores nothing and can be sent again with the same photo and reading', async () => {
    const user = userEvent.setup();
    const { api, router } = open({ failSends: 1 });
    await user.click(await shutter());
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa gửi được lần quẹt');
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa có gì được lưu');
    expect(screen.getByRole('img', { name: 'Ảnh vừa chụp' })).toBeInTheDocument();
    // The shutter is gone: the focus goes to "Thử lại", not to the page.
    expect(screen.getByRole('button', { name: 'Thử lại' })).toHaveFocus();
    expect(router.state.location.pathname).toBe('/checkin');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(api.sends).toHaveLength(2);
    expect(api.sends[1]).toEqual(api.sends[0]);
    // The position was read once: the retry used the reading that was on the phone.
    expect(api.locates).toHaveLength(1);
  });

  it('"Chụp lại" drops the photo and reads the position again for the next one', async () => {
    const user = userEvent.setup();
    const { api } = open({ failSends: 1 });
    await user.click(await shutter());
    await user.click(await screen.findByRole('button', { name: 'Chụp lại' }));
    await waitFor(() => expect(api.locates).toHaveLength(2));
    expect(await shutter()).toBeEnabled();
    expect(screen.queryByRole('img', { name: 'Ảnh vừa chụp' })).not.toBeInTheDocument();
  });

  it('outside the zone the punch is still allowed, with a warning, and the toast says it will be reviewed', async () => {
    const user = userEvent.setup();
    const { api } = open({ reading: OUTSIDE_READING });
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn đang ngoài vùng chấm công');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Ngoài vùng · gần nhất Văn phòng chính');
    await user.click(await shutter());
    expect(await within(toastRegion()).findByText(/ngoài vùng, quản lý trực tiếp sẽ xem lại/)).toBeInTheDocument();
    expect(api.sends).toHaveLength(1);
  });

  it('with a poor reading, offers to read again, or to punch anyway', async () => {
    const user = userEvent.setup();
    const { api } = open({ reading: LOW_ACCURACY_READING });
    expect(await screen.findByRole('alert')).toHaveTextContent('Vị trí chưa chính xác: sai số 180 m, tối đa 100 m');
    await user.click(screen.getByRole('button', { name: 'Đọc lại vị trí' }));
    await waitFor(() => expect(api.locates).toHaveLength(2));
    await user.click(await shutter());
    await waitFor(() => expect(api.sends).toHaveLength(1));
    expect(api.sends[0]!.accuracyMeters).toBe('12');
  });

  it('a photo the server refuses for what it is must be taken again', async () => {
    const user = userEvent.setup();
    const { api } = open({ refuseSend: { status: 400, code: 'validation.invalid', errors: [{ field: 'photo', code: 'too_large' }] } });
    await user.click(await shutter());
    expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh không dùng được');
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chụp lại' }));
    await waitFor(() => expect(api.locates).toHaveLength(2));
  });

  it('asks for the consent again when it was withdrawn while the camera was open', async () => {
    const user = userEvent.setup();
    open({ refuseSend: { status: 403, code: 'mobile_checkin.consent_required' } });
    await user.click(await shutter());
    expect(await screen.findByRole('heading', { level: 1, name: 'Đồng ý lại trước khi chấm công' })).toBeInTheDocument();
  });

  it('shows the sending state while the punch is on its way', async () => {
    const user = userEvent.setup();
    open({ writeDelay: 150 });
    await user.click(await shutter());
    expect(await screen.findByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  });
});
