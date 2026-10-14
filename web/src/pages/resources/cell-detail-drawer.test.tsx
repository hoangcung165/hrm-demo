import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { orgUnitOptionsOk } from '@/test/org-unit-handlers';
import { cellDetailApi, cellDetailFail, heatmapApi, personId, resourceListsApi } from '@/test/resource-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] };
/** A PM sees the resources and the projects, but not the profiles. */
const PM: Account = { ...HR_ACCOUNT, roles: ['PROJECT_MANAGER', 'EMPLOYEE'], dataScope: 'SELF', permissions: ['COMPANY_VIEW', 'ACCOUNT_VIEW', 'PROJECT_VIEW', 'RESOURCE_VIEW'] };

const open = (session: Account = HR, detail = cellDetailApi()) => {
  server.use(heatmapApi().handler, detail.handler, orgUnitOptionsOk(), ...resourceListsApi().handlers);
  renderRoutes(routes, { session, path: '/resources' });
  return detail;
};
/** The cell of a person in the nth column (0 is this week). */
const cell = async (name: string, column: number) => {
  const row = (await screen.findByRole('rowheader', { name: new RegExp(name) })).closest('tr')!;
  await waitFor(() => expect(within(row).getAllByRole('button').length).toBeGreaterThan(column));
  return within(row).getAllByRole('button')[column]!;
};
const drawer = () => screen.findByRole('dialog', { name: /Cao Minh Trí|Phan Khánh Duy|Trần Thị Mai/ });

describe('Heatmap cell detail drawer', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('opens from a cell with the person, the overload and the projects that add up, and the heatmap stays usable', async () => {
    const user = userEvent.setup();
    const detail = open();
    await user.click(await cell('Cao Minh Trí', 1));

    const panel = await drawer();
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(within(panel).getByText('Chi tiết ô heatmap')).toBeInTheDocument();
    expect(await within(panel).findByText(/NV00031 · Lập trình viên · Phòng Phát triển phần mềm/)).toBeInTheDocument();
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Cao Minh Trí quá tải, cao nhất 120%');
    expect(within(panel).getByText('DA-029 60% + DA-031 60%')).toBeInTheDocument();
    expect(within(panel).getByText('Phân bổ trong kỳ (2)')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'DA-029 · Cổng khách hàng bảo hiểm' })).toHaveAttribute('href', expect.stringMatching(/\/projects\/p-DA-029$/));
    expect(within(panel).getByRole('link', { name: 'Xem hồ sơ' })).toHaveAttribute('href', `/employees/${personId(1)}`);
    expect(detail.requests).toHaveLength(1);
    // The cell is marked as the open one and the heatmap behind the drawer is still there.
    expect(await cell('Cao Minh Trí', 1)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('table', { name: 'Heatmap Tải phân bổ theo nhân viên' })).toBeInTheDocument();
  });

  it('shows the next allocation when the period has none', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await cell('Phan Khánh Duy', 6));

    const panel = await screen.findByRole('dialog', { name: /Phan Khánh Duy/ });
    expect(await within(panel).findByText('Kỳ này chưa có phân bổ')).toBeInTheDocument();
    expect(within(panel).getByText(/Phân bổ kế tiếp: DA-033 · Nền tảng dữ liệu nội bộ từ \d{2}\/\d{2}\/\d{4}, 30%\./)).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('steps to the neighbouring periods and stops at the edges of the heatmap', async () => {
    const user = userEvent.setup();
    const detail = open();
    await user.click(await cell('Cao Minh Trí', 0));
    const panel = await drawer();
    expect(within(panel).getByRole('button', { name: 'Kỳ trước' })).toBeDisabled();
    await within(panel).findByText('DA-027 · Hệ thống bán hàng tại quầy');

    await user.click(within(panel).getByRole('button', { name: 'Kỳ sau' }));
    expect(await within(panel).findByRole('alert')).toHaveTextContent('120%');
    expect(detail.requests).toHaveLength(2);
    expect(await cell('Cao Minh Trí', 1)).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByRole('button', { name: 'Kỳ trước' })).toBeEnabled();
  });

  it('closes with Esc and gives focus back to the cell; the close button does the same', async () => {
    const user = userEvent.setup();
    open();
    const opener = await cell('Cao Minh Trí', 1);
    await user.click(opener);
    const panel = await drawer();
    await waitFor(() => expect(panel).toHaveFocus());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Cao Minh Trí/ })).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(opener).toHaveAttribute('aria-pressed', 'false');

    await user.click(opener);
    await user.click(await within(await drawer()).findByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Cao Minh Trí/ })).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('opens from the keyboard with Enter', async () => {
    const user = userEvent.setup();
    open();
    (await cell('Cao Minh Trí', 2)).focus();
    await user.keyboard('{Enter}');
    expect(await drawer()).toBeInTheDocument();
  });

  it('leaves out the profile link without the profile permission, and keeps the project links', async () => {
    const user = userEvent.setup();
    open(PM);
    await user.click(await cell('Cao Minh Trí', 1));
    const panel = await drawer();
    await within(panel).findByText('Phân bổ trong kỳ (2)');
    expect(within(panel).queryByRole('link', { name: 'Xem hồ sơ' })).not.toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /DA-031/ })).toBeInTheDocument();
  });

  it('says so and retries when the detail cannot be loaded', async () => {
    const user = userEvent.setup();
    server.use(heatmapApi().handler, cellDetailFail(), orgUnitOptionsOk(), ...resourceListsApi().handlers);
    renderRoutes(routes, { session: HR, path: '/resources' });
    await user.click(await cell('Cao Minh Trí', 1));

    const panel = await screen.findByRole('dialog');
    expect(await within(panel).findByText('Không tải được chi tiết ô')).toBeInTheDocument();
    server.use(cellDetailApi().handler);
    await user.click(within(panel).getByRole('button', { name: 'Thử lại' }));
    expect(await within(panel).findByText('Phân bổ trong kỳ (2)')).toBeInTheDocument();
  });
});
