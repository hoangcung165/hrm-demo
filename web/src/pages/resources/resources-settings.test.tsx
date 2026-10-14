import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { heatmapApi, resourceListsApi, settingsApi, settingsDenied, settingsLoadFail } from '@/test/resource-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const base = ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'EMPLOYEE_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] as const;
/** The Giám đốc and the Admin may change the thresholds. */
const DIRECTOR: Account = { ...HR_ACCOUNT, permissions: [...base, 'RESOURCE_EDIT'] };
/** HR reads the resources only. */
const VIEWER: Account = { ...HR_ACCOUNT, permissions: [...base] };

const open = (session: Account = DIRECTOR, settings = settingsApi(), path = '/resources?tab=heatmap') => {
  const heatmap = heatmapApi();
  server.use(heatmap.handler, orgUnitOptionsOk(), ...resourceListsApi().handlers, ...settings.handlers);
  return { heatmap, settings, ...renderRoutes(routes, { session, path }) };
};
const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Ngưỡng nguồn lực' }));
  return screen.findByRole('dialog', { name: 'Ngưỡng nguồn lực' });
};
const field = (dialog: HTMLElement, name: string) => within(dialog).getByRole('textbox', { name: new RegExp(`^${name}`) });
const type = async (user: ReturnType<typeof userEvent.setup>, input: HTMLElement, value: string) => {
  await user.clear(input);
  if (value) await user.type(input, value);
};

describe('Nguồn lực: Ngưỡng nguồn lực', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('has no button for someone without RESOURCE_EDIT, and the legend still states the thresholds', async () => {
    open(VIEWER);
    expect(await screen.findByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('Dưới 50%');
    expect(screen.queryByRole('button', { name: 'Ngưỡng nguồn lực' })).not.toBeInTheDocument();
  });

  it('opens with the thresholds in force, the preview of the scale and when they were last changed', async () => {
    const user = userEvent.setup();
    open(DIRECTOR, settingsApi({ benchPercent: 40, nearFullPercent: 85, endingWeeks: 6, customized: true, updatedAt: '2026-10-14T03:30:00Z', updatedByName: 'Phạm Quốc Bảo' }));
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('40'));
    expect(field(dialog, 'Mức gần đầy')).toHaveValue('85');
    expect(field(dialog, 'Sắp hết dự án')).toHaveValue('6');
    expect(within(dialog).getByText(/Sửa lần cuối bởi Phạm Quốc Bảo/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' })).toBeDisabled();
  });

  it('draws the preview from the fields as they are typed', async () => {
    const user = userEvent.setup();
    open();
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50'));
    expect(within(dialog).getByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('Dưới 50%');
    await type(user, field(dialog, 'Ngưỡng Bench'), '30');
    expect(within(dialog).getByRole('list', { name: 'Chú giải Tải phân bổ' })).toHaveTextContent('Dưới 30%');
    expect(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' })).toBeEnabled();
  });

  it('saves, closes with a toast, and refetches the heatmap', async () => {
    const user = userEvent.setup();
    const { settings, heatmap } = open();
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50'));
    await waitFor(() => expect(heatmap.requests.length).toBeGreaterThan(0));
    const before = heatmap.requests.length;
    await type(user, field(dialog, 'Ngưỡng Bench'), '40');
    await type(user, field(dialog, 'Sắp hết dự án'), '6');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(settings.saves).toEqual([{ benchPercent: 40, nearFullPercent: 90, endingWeeks: 6 }]);
    expect(await screen.findByText('Đã lưu ngưỡng nguồn lực')).toBeInTheDocument();
    await waitFor(() => expect(heatmap.requests.length).toBeGreaterThan(before));
    expect(screen.getByRole('button', { name: 'Ngưỡng nguồn lực' })).toHaveFocus();
  });

  it('says under the fields what is wrong, stays open, and sends nothing while a value is not valid', async () => {
    const user = userEvent.setup();
    const { settings } = open();
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50'));
    await type(user, field(dialog, 'Ngưỡng Bench'), '95');
    await type(user, field(dialog, 'Sắp hết dự án'), '13');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' }));
    expect(await within(dialog).findByText('Ngưỡng Bench phải nhỏ hơn mức gần đầy (90%).')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập số tuần từ 1 đến 12.')).toBeInTheDocument();
    expect(field(dialog, 'Ngưỡng Bench')).toHaveFocus();
    expect(settings.saves).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the errors the API reports on their fields and keeps what was typed', async () => {
    const user = userEvent.setup();
    const settings = settingsApi();
    open(DIRECTOR, settings);
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50'));
    // The client rule passes (a number from 1 to 99), the server refuses: someone else already moved the near-full level.
    server.use(
      http.put('*/api/resource-settings', () => problem(400, 'validation.invalid', { errors: [{ field: 'benchPercent', code: 'not_below_near_full' }, { field: 'endingWeeks', code: 'out_of_range' }] })),
    );
    await type(user, field(dialog, 'Ngưỡng Bench'), '60');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' }));
    expect(await within(dialog).findByText('Ngưỡng Bench phải nhỏ hơn mức gần đầy (90%).')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập số tuần từ 1 đến 12.')).toBeInTheDocument();
    expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('60');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('puts the defaults in the fields with "Khôi phục mặc định"; saving them makes the company follow the defaults again', async () => {
    const user = userEvent.setup();
    const { settings } = open(DIRECTOR, settingsApi({ benchPercent: 40, nearFullPercent: 85, endingWeeks: 6, customized: true, updatedAt: '2026-10-14T03:30:00Z', updatedByName: 'Phạm Quốc Bảo' }));
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('40'));
    await user.click(within(dialog).getByRole('button', { name: 'Khôi phục mặc định' }));
    expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50');
    expect(field(dialog, 'Mức gần đầy')).toHaveValue('90');
    expect(field(dialog, 'Sắp hết dự án')).toHaveValue('4');
    expect(within(dialog).getByRole('button', { name: 'Khôi phục mặc định' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(settings.saves).toEqual([{ benchPercent: 50, nearFullPercent: 90, endingWeeks: 4 }]);
  });

  it('closes with Hủy or Esc without saving', async () => {
    const user = userEvent.setup();
    const { settings } = open();
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50'));
    await type(user, field(dialog, 'Ngưỡng Bench'), '30');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(settings.saves).toHaveLength(0);
  });

  it('tells a save that is refused for lack of permission, and closes', async () => {
    const user = userEvent.setup();
    open();
    server.use(settingsDenied());
    const dialog = await openDialog(user);
    await waitFor(() => expect(field(dialog, 'Ngưỡng Bench')).toHaveValue('50'));
    await type(user, field(dialog, 'Ngưỡng Bench'), '30');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ngưỡng' }));
    expect(await screen.findByText('Chưa lưu được ngưỡng nguồn lực')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says the thresholds could not be loaded and offers a retry', async () => {
    const user = userEvent.setup();
    open();
    server.use(settingsLoadFail());
    const dialog = await openDialog(user);
    expect(await within(dialog).findByText('Không tải được ngưỡng nguồn lực')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Lưu ngưỡng' })).not.toBeInTheDocument();
  });

  it('is not offered on a phone, where the heatmap is view-only', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)', addEventListener: () => {}, removeEventListener: () => {} }));
    open();
    await screen.findByRole('heading', { level: 1, name: 'Nguồn lực' });
    expect(screen.queryByRole('button', { name: 'Ngưỡng nguồn lực' })).not.toBeInTheDocument();
  });
});
