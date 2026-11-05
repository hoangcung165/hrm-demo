import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { HCM_OFFICE, locationApi, OLD_OFFICE, RULES } from '@/test/checkin-location-handlers';
import { restoreDevices } from '@/test/device-stubs';
import { server } from '@/test/server';
import { asPhone, HR, open, OTHER, rowOf, table } from './checkin-locations-test-utils';

describe('CheckinLocationsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    restoreDevices();
  });

  it('lists the places by name with address, coordinates, radius, punches in 30 days and status', async () => {
    open();
    const office = await rowOf('Văn phòng chính');
    expect(within(office).getByText('Tầng 8, 22 Trần Thái Tông, Cầu Giấy, Hà Nội')).toBeInTheDocument();
    expect(within(office).getByText('21,03100; 105,78900')).toBeInTheDocument();
    expect(within(office).getByText('150 m')).toBeInTheDocument();
    expect(within(office).getByText('148')).toBeInTheDocument();
    expect(within(office).getByText('Đang dùng')).toBeInTheDocument();
    const names = within(await table()).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0]!.textContent);
    expect(names).toEqual(['Trung tâm dữ liệu Hòa Lạc', 'Văn phòng chính', 'Văn phòng Duy Tân (cũ)', 'Văn phòng TP.HCM'].sort((a, b) => a.localeCompare(b, 'vi')));
    expect(within(await rowOf(HCM_OFFICE.name)).getByText('Chưa có địa chỉ')).toBeInTheDocument();
    expect(within(await rowOf(OLD_OFFICE.name)).getByText('Ngừng dùng')).toBeInTheDocument();
  });

  it('shows the company-wide rules', async () => {
    open();
    const card = await screen.findByRole('region', { name: 'Quy tắc chấm công bằng điện thoại' });
    expect(await within(card).findByText('Mọi nhân viên đã đồng ý')).toBeInTheDocument();
    expect(within(card).getByText('100 m')).toBeInTheDocument();
    expect(within(card).getByText(/Mặc định \(100 m\)/)).toBeInTheDocument();
    expect(within(card).getByText('Bắt buộc, camera trước')).toBeInTheDocument();
    expect(within(card).getByText('128')).toBeInTheDocument();
  });

  it('says who changed the maximum accuracy', async () => {
    open(HR, { rules: { ...RULES, maxAccuracyMeters: 50, customized: true, updatedAt: '2026-11-03T03:00:00Z', updatedByName: 'Trần Thị Mai' } });
    const card = await screen.findByRole('region', { name: 'Quy tắc chấm công bằng điện thoại' });
    expect(await within(card).findByText('50 m')).toBeInTheDocument();
    expect(within(card).getByText(/Trần Thị Mai đã đổi lúc 03\/11\/2026 10:00/)).toBeInTheDocument();
  });

  it('has no entry point without the permission, and the page is the denied state', async () => {
    const { api } = open(OTHER);
    expect(await screen.findByText('Bạn không có quyền quản lý địa điểm chấm công')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm địa điểm chấm công' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Địa điểm chấm công' })).not.toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });

  it('has a sidebar entry with the permission', async () => {
    open();
    expect(await screen.findByRole('link', { name: 'Địa điểm chấm công' })).toHaveAttribute('href', '/attendance-locations');
  });

  it('asks for the first place when there is none', async () => {
    open(HR, { places: [] });
    expect(await screen.findByText('Chưa có địa điểm chấm công')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Thêm địa điểm chấm công' })).toHaveLength(2);
  });

  it('says the list could not load and loads it again on retry', async () => {
    const user = userEvent.setup();
    open(HR, { failList: true });
    expect(await screen.findByText('Không tải được danh sách địa điểm chấm công')).toBeInTheDocument();
    server.resetHandlers(...locationApi().handlers);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await rowOf('Văn phòng chính')).toBeInTheDocument();
  });

  it('says the rules could not load, and the list still shows', async () => {
    open(HR, { failRules: true });
    expect(await screen.findByText('Không tải được quy tắc chấm công')).toBeInTheDocument();
    expect(await rowOf('Văn phòng chính')).toBeInTheDocument();
  });

  it('shows compact rows with the menu at phone width', async () => {
    asPhone();
    open();
    const list = await screen.findByRole('list', { name: 'Danh sách địa điểm chấm công' });
    const row = within(list).getAllByRole('listitem').find((item) => item.textContent?.includes('Văn phòng chính'))!;
    expect(row).toHaveTextContent('Bán kính 150 m');
    expect(row).toHaveTextContent('148 lần chấm công trong 30 ngày');
    expect(row).toHaveTextContent('Đang dùng');
    expect(within(row).getByRole('button', { name: 'Thao tác với địa điểm Văn phòng chính' })).toBeInTheDocument();
  });

  it('is in English too', async () => {
    await i18n.changeLanguage('en');
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'Check-in locations' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Check-in locations' })).toBeInTheDocument();
    expect(await screen.findByText('Phone check-in rules')).toBeInTheDocument();
    await i18n.changeLanguage('vi');
  });
});
