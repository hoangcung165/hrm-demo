import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { HEAD_OFFICE, OLD_OFFICE } from '@/test/checkin-location-handlers';
import { restoreDevices } from '@/test/device-stubs';
import { toastRegion } from '@/test/render';
import { fill, HR, open, rowOf } from './checkin-locations-test-utils';

describe('CheckinLocationsPage actions', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    restoreDevices();
  });

  it('adds a place and shows it in the list with a toast', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, { places: [HEAD_OFFICE] });
    await user.click(await screen.findByRole('button', { name: 'Thêm địa điểm chấm công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    await fill(dialog, user, { 'Tên địa điểm': '  Kho Long Biên ', 'Địa chỉ': 'Long Biên, Hà Nội', 'Vĩ độ': '21,0458', 'Kinh độ': '105.8812', 'Bán kính': '250' });
    await user.click(within(dialog).getByRole('button', { name: 'Thêm địa điểm chấm công' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toEqual([{ method: 'POST', body: { name: 'Kho Long Biên', address: 'Long Biên, Hà Nội', latitude: 21.0458, longitude: 105.8812, radiusMeters: 250 } }]);
    expect(await within(toastRegion()).findByText('Đã thêm địa điểm Kho Long Biên')).toBeInTheDocument();
    expect(await rowOf('Kho Long Biên')).toBeInTheDocument();
  });

  it('stores a blank address as none', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, { places: [] });
    await user.click((await screen.findAllByRole('button', { name: 'Thêm địa điểm chấm công' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    await fill(dialog, user, { 'Tên địa điểm': 'Kho', 'Vĩ độ': '21', 'Kinh độ': '105' });
    await user.click(within(dialog).getByRole('button', { name: 'Thêm địa điểm chấm công' }));
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]!.body).toMatchObject({ address: null, radiusMeters: 100 });
  });

  it('says what is wrong on each field and saves nothing', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, { places: [HEAD_OFFICE] });
    await user.click(await screen.findByRole('button', { name: 'Thêm địa điểm chấm công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    await fill(dialog, user, { 'Vĩ độ': '91', 'Kinh độ': 'abc', 'Bán kính': '20' });
    await user.click(within(dialog).getByRole('button', { name: 'Thêm địa điểm chấm công' }));
    expect(await within(dialog).findByText('Nhập tên địa điểm.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vĩ độ là số từ -90 đến 90, ví dụ 21.031.')).toBeInTheDocument();
    expect(within(dialog).getByText('Kinh độ là số từ -180 đến 180, ví dụ 105.789.')).toBeInTheDocument();
    expect(within(dialog).getByText('Bán kính từ 50 đến 1.000 mét.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Tên địa điểm/)).toHaveFocus();
    expect(api.writes).toHaveLength(0);
  });

  it('shows a taken name on its field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const { api } = open(HR, { places: [HEAD_OFFICE, OLD_OFFICE] });
    await user.click(await screen.findByRole('button', { name: 'Thêm địa điểm chấm công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    await fill(dialog, user, { 'Tên địa điểm': 'văn phòng duy tân (cũ)', 'Vĩ độ': '21', 'Kinh độ': '105' });
    await user.click(within(dialog).getByRole('button', { name: 'Thêm địa điểm chấm công' }));
    expect(await within(dialog).findByText(/Đã có địa điểm tên này/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Tên địa điểm/)).toHaveFocus();
    expect(api.writes).toHaveLength(1);
  });

  it('edits a place: save waits for a change, and the old punches are not recomputed', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(within(await rowOf('Văn phòng chính')).getByRole('button', { name: 'Thao tác với địa điểm Văn phòng chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sửa địa điểm' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa địa điểm: Văn phòng chính' });
    expect(within(dialog).getByText('Sửa địa điểm không tính lại các lần chấm công đã lưu.')).toBeInTheDocument();
    const save = within(dialog).getByRole('button', { name: 'Lưu thay đổi' });
    expect(save).toBeDisabled();
    await fill(dialog, user, { 'Bán kính': '180' });
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toEqual([{ method: 'PUT', id: HEAD_OFFICE.id, body: { name: 'Văn phòng chính', address: HEAD_OFFICE.address, latitude: 21.031, longitude: 105.789, radiusMeters: 180 } }]);
    expect(await within(toastRegion()).findByText('Đã lưu địa điểm Văn phòng chính')).toBeInTheDocument();
    expect(within(await rowOf('Văn phòng chính')).getByText('180 m')).toBeInTheDocument();
  });

  it('asks before making a place inactive, then offers it again', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(within(await rowOf('Văn phòng chính')).getByRole('button', { name: 'Thao tác với địa điểm Văn phòng chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ngừng dùng' }));
    const confirm = await screen.findByRole('dialog', { name: 'Ngừng dùng địa điểm Văn phòng chính?' });
    expect(api.writes).toHaveLength(0);
    await user.click(within(confirm).getByRole('button', { name: 'Ngừng dùng' }));
    expect(await within(toastRegion()).findByText('Đã ngừng dùng địa điểm Văn phòng chính')).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByText('Văn phòng chính').closest('tr') as HTMLElement).getByText('Ngừng dùng')).toBeInTheDocument());
    await user.click(within(await rowOf('Văn phòng chính')).getByRole('button', { name: 'Thao tác với địa điểm Văn phòng chính' }));
    expect(screen.queryByRole('menuitem', { name: 'Xóa' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('menuitem', { name: 'Dùng lại' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Dùng lại địa điểm Văn phòng chính?' })).getByRole('button', { name: 'Dùng lại' }));
    await waitFor(() => expect(api.writes.map((write) => write.method)).toEqual(['deactivate', 'reactivate']));
  });

  it('leaves a place as it is when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const { api } = open();
    await user.click(within(await rowOf('Văn phòng chính')).getByRole('button', { name: 'Thao tác với địa điểm Văn phòng chính' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ngừng dùng' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Hủy' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toHaveLength(0);
  });

  it('fills the coordinates from this device only after the tap', async () => {
    const user = userEvent.setup();
    const { device } = open(HR, { places: [HEAD_OFFICE] }, { coords: { latitude: 21.0458123, longitude: 105.8812987, accuracy: 18 } });
    await user.click(await screen.findByRole('button', { name: 'Thêm địa điểm chấm công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    expect(device!.getCurrentPosition).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Dùng vị trí hiện tại' }));
    expect(await within(dialog).findByText(/Đã điền tọa độ, sai số khoảng 18 m/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Vĩ độ/)).toHaveValue('21.04581');
    expect(within(dialog).getByLabelText(/^Kinh độ/)).toHaveValue('105.8813');
    expect(device!.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('says why the position could not be read and leaves the fields to type in', async () => {
    const user = userEvent.setup();
    open(HR, { places: [HEAD_OFFICE] }, { position: 'denied' });
    await user.click(await screen.findByRole('button', { name: 'Thêm địa điểm chấm công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    await user.click(within(dialog).getByRole('button', { name: 'Dùng vị trí hiện tại' }));
    expect(await within(dialog).findByText(/Trình duyệt chưa được cho phép đọc vị trí/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Vĩ độ/)).toHaveValue('');
  });

  it('closes the form and shows the page denied when a save finds the permission gone', async () => {
    const user = userEvent.setup();
    open(HR, { places: [HEAD_OFFICE], denyWrites: true });
    await user.click(await screen.findByRole('button', { name: 'Thêm địa điểm chấm công' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm địa điểm chấm công' });
    await fill(dialog, user, { 'Tên địa điểm': 'Kho', 'Vĩ độ': '21', 'Kinh độ': '105' });
    await user.click(within(dialog).getByRole('button', { name: 'Thêm địa điểm chấm công' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(toastRegion()).findByText('Không thêm được địa điểm chấm công')).toBeInTheDocument();
  });
});
