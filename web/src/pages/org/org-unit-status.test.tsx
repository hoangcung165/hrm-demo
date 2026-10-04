import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { orgStructure, unitId } from '@/test/org-unit-fixtures';
import { orgUnitApi } from '@/test/org-unit-handlers';
import { ADMIN_ACCOUNT, DIRECTOR_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const COMPANY_NAME = 'Công ty Cổ phần Công nghệ Mẫu';
const DEACTIVATE_TEXT = 'Đơn vị sẽ không còn trong danh sách chọn khi thêm nhân viên hoặc đơn vị mới. Bạn có thể kích hoạt lại bất cứ lúc nào.';
const filled = () => orgUnitApi(orgStructure({ filled: true }));
const detail = (name: string) => screen.findByRole('region', { name });
const mainRow = (name: string) => within(screen.getByRole('tree', { name: 'Cây đơn vị' })).getByRole('treeitem', { name: new RegExp(`^${name},`) });
const names = (elements: HTMLElement[]) => elements.map((element) => element.getAttribute('aria-label') ?? element.textContent);
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

/** Opens the page on a fixture unit. */
async function openUnit(code: string, name: string, org = filled(), session = HR_ACCOUNT) {
  server.use(...org.handlers);
  const view = renderRoutes(routes, { session, path: `/org?unit=${unitId(code)}` });
  return { org, ...view, unit: await detail(name) };
}
/** Opens the "more" menu of the selected unit and chooses an item; returns the dialog it opens. */
async function choose(name: string, item: string) {
  await userEvent.click(screen.getByRole('button', { name: `Thao tác khác cho ${name}` }));
  await userEvent.click(within(await screen.findByRole('menu', { name: `Thao tác khác cho ${name}` })).getByRole('menuitem', { name: item }));
  return screen.findByRole('dialog');
}
const inDialog = (name: string) => within(screen.getByRole('dialog')).getByRole('button', { name });

describe('OrgPage: deactivate, reactivate and delete a unit', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('active unit: the "more" button ends the action row; its menu holds deactivate and the destructive delete', async () => {
    const { unit } = await openUnit('DATA', 'Nhóm Dữ liệu');
    expect(names(within(unit).getAllByRole('button'))).toEqual(['Sửa', 'Chuyển đơn vị', 'Thêm đơn vị con', 'Thao tác khác cho Nhóm Dữ liệu']);
    await userEvent.click(within(unit).getByRole('button', { name: 'Thao tác khác cho Nhóm Dữ liệu' }));
    const menu = await screen.findByRole('menu', { name: 'Thao tác khác cho Nhóm Dữ liệu' });
    expect(names(within(menu).getAllByRole('menuitem'))).toEqual(['Ngừng hoạt động', 'Xóa đơn vị']);
    expect(within(menu).getByRole('separator')).toBeInTheDocument();
  });

  it('inactive unit: "Kích hoạt lại · Sửa · more", and the menu holds only delete', async () => {
    const { unit } = await openUnit('GAME', 'Nhóm Game', filled(), ADMIN_ACCOUNT);
    expect(names(within(unit).getAllByRole('button'))).toEqual(['Kích hoạt lại', 'Sửa', 'Thao tác khác cho Nhóm Game']);
    await userEvent.click(within(unit).getByRole('button', { name: 'Thao tác khác cho Nhóm Game' }));
    expect(names(within(await screen.findByRole('menu')).getAllByRole('menuitem'))).toEqual(['Xóa đơn vị']);
  });

  it('the company has no "more" menu, and a view-only Account (DIRECTOR) has no action at all', async () => {
    const { router } = await openUnit('GAME', 'Nhóm Game', filled(), DIRECTOR_ACCOUNT);
    expect(within(await detail('Nhóm Game')).queryAllByRole('button')).toEqual([]);
    await router.navigate('/org');
    expect(within(await detail(COMPANY_NAME)).queryAllByRole('button')).toEqual([]);
  });

  it('the company has no "more" menu for an editor either', async () => {
    server.use(...filled().handlers);
    renderRoutes(routes, { path: '/org' });
    expect(names(within(await detail(COMPANY_NAME)).getAllByRole('button'))).toEqual(['Thêm đơn vị con']);
  });

  it('deactivates after the confirm: toast, inactive Badge, the unit still selected, focus back on "more"', async () => {
    const { org, router, unit } = await openUnit('DATA', 'Nhóm Dữ liệu');
    const dialog = await choose('Nhóm Dữ liệu', 'Ngừng hoạt động');
    expect(dialog).toHaveAccessibleName('Ngừng hoạt động Nhóm Dữ liệu?');
    expect(dialog).toHaveAccessibleDescription(`8 nhân viên vẫn thuộc Nhóm Dữ liệu cho đến khi được chuyển sang đơn vị khác. ${DEACTIVATE_TEXT}`);
    expect(names(within(dialog).getAllByRole('button'))).toEqual(['Hủy', 'Ngừng hoạt động']);
    expect(org.statusCalls).toEqual([]);

    await userEvent.click(inDialog('Ngừng hoạt động'));
    await closed();
    expect(org.statusCalls).toEqual([{ action: 'deactivate', id: unitId('DATA') }]);
    expect(toastRegion()).toHaveTextContent('Đã ngừng hoạt động Nhóm Dữ liệu');
    expect(router.state.location.search).toBe(`?unit=${unitId('DATA')}`);
    expect(within(unit).getByText('Ngừng hoạt động')).toBeInTheDocument();
    expect(names(within(unit).getAllByRole('button'))).toEqual(['Kích hoạt lại', 'Sửa', 'Thao tác khác cho Nhóm Dữ liệu']);
    expect(mainRow('Nhóm Dữ liệu')).toHaveAccessibleName(/Ngừng hoạt động$/);
    expect(mainRow('Nhóm Dữ liệu')).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(within(unit).getByRole('button', { name: 'Thao tác khác cho Nhóm Dữ liệu' })).toHaveFocus());
  });

  it('fits the confirm to the unit: no employees, and child units that stay active', async () => {
    // No employee, no child unit: only what deactivation does.
    const empty = await openUnit('WEB', 'Nhóm Web', orgUnitApi());
    expect(await choose('Nhóm Web', 'Ngừng hoạt động')).toHaveAccessibleDescription(DEACTIVATE_TEXT);
    await userEvent.click(inDialog('Hủy'));
    await closed();
    expect(empty.org.statusCalls).toEqual([]);
    empty.unmount();

    // Employees of the unit itself (2 of 78), and its active child units (5 of 6: Nhóm Game is inactive).
    await openUnit('PTPM', 'Phòng Phát triển phần mềm');
    expect(await choose('Phòng Phát triển phần mềm', 'Ngừng hoạt động')).toHaveAccessibleDescription(
      `2 nhân viên vẫn thuộc Phòng Phát triển phần mềm cho đến khi được chuyển sang đơn vị khác. 5 đơn vị con đang hoạt động không bị ngừng theo. ${DEACTIVATE_TEXT}`,
    );
  });

  it('reactivates at once: toast, active Badge, the full action row, focus on the detail heading', async () => {
    const { org, router, unit } = await openUnit('GAME', 'Nhóm Game');
    await userEvent.click(within(unit).getByRole('button', { name: 'Kích hoạt lại' }));
    await waitFor(() => expect(toastRegion()).toHaveTextContent('Đã kích hoạt lại Nhóm Game'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(org.statusCalls).toEqual([{ action: 'reactivate', id: unitId('GAME') }]);
    expect(router.state.location.search).toBe(`?unit=${unitId('GAME')}`);
    expect(within(unit).getByText('Đang hoạt động')).toBeInTheDocument();
    expect(names(within(unit).getAllByRole('button'))).toEqual(['Sửa', 'Chuyển đơn vị', 'Thêm đơn vị con', 'Thao tác khác cho Nhóm Game']);
    expect(within(unit).getByRole('heading', { level: 2, name: 'Nhóm Game' })).toHaveFocus();
  });

  it('deletes an empty unit after the confirm and selects its parent', async () => {
    const { org, router } = await openUnit('GAME', 'Nhóm Game');
    const dialog = await choose('Nhóm Game', 'Xóa đơn vị');
    expect(dialog).toHaveAccessibleName('Xóa Nhóm Game?');
    expect(dialog).toHaveAccessibleDescription('Nhóm Game không có nhân viên và đơn vị con. Sau khi xóa không thể khôi phục.');
    expect(names(within(dialog).getAllByRole('button'))).toEqual(['Hủy', 'Xóa đơn vị']);

    await userEvent.click(inDialog('Xóa đơn vị'));
    await closed();
    expect(org.statusCalls).toEqual([{ action: 'delete', id: unitId('GAME') }]);
    expect(toastRegion()).toHaveTextContent('Đã xóa Nhóm Game');
    expect(router.state.location.search).toBe(`?unit=${unitId('PTPM')}`);
    const parent = await detail('Phòng Phát triển phần mềm');
    expect(within(screen.getByRole('tree', { name: 'Cây đơn vị' })).queryByRole('treeitem', { name: /^Nhóm Game,/ })).not.toBeInTheDocument();
    expect(mainRow('Phòng Phát triển phần mềm')).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(within(parent).getByRole('heading', { level: 2 })).toHaveFocus());
  });

  it('deleting a top-level unit selects the company', async () => {
    const { router } = await openUnit('TCKT', 'Phòng Tài chính - Kế toán', orgUnitApi());
    await choose('Phòng Tài chính - Kế toán', 'Xóa đơn vị');
    await userEvent.click(inDialog('Xóa đơn vị'));
    await closed();
    expect(router.state.location.search).toBe('');
    await waitFor(async () => expect(within(await detail(COMPANY_NAME)).getByRole('heading', { level: 2 })).toHaveFocus());
  });

  it('a unit with employees and child units cannot be deleted: the blocked dialog has the counts and offers deactivation', async () => {
    const { org, unit } = await openUnit('KD', 'Phòng Kinh doanh');
    const dialog = await choose('Phòng Kinh doanh', 'Xóa đơn vị');
    expect(dialog).toHaveAccessibleName('Không xóa được Phòng Kinh doanh');
    expect(dialog).toHaveAccessibleDescription(
      'Đơn vị còn 2 nhân viên và 2 đơn vị con. Chuyển nhân viên và đơn vị con sang đơn vị khác rồi xóa, hoặc ngừng hoạt động đơn vị để giữ lại lịch sử.',
    );
    expect(names(within(dialog).getAllByRole('button'))).toEqual(['Đóng', 'Ngừng hoạt động']);

    await userEvent.click(inDialog('Ngừng hoạt động'));
    await closed();
    // Nothing was deleted; the unit is deactivated instead.
    expect(org.statusCalls).toEqual([{ action: 'deactivate', id: unitId('KD') }]);
    expect(toastRegion()).toHaveTextContent('Đã ngừng hoạt động Phòng Kinh doanh');
    expect(within(unit).getByText('Ngừng hoạt động')).toBeInTheDocument();
    expect(mainRow('Nhóm Marketing')).not.toHaveAccessibleName(/Ngừng hoạt động$/);
  });

  it('fits the blocked dialog to what is left: only employees, only child units, and an inactive unit', async () => {
    const onlyEmployees = await openUnit('DATA', 'Nhóm Dữ liệu');
    expect(await choose('Nhóm Dữ liệu', 'Xóa đơn vị')).toHaveAccessibleDescription(
      'Đơn vị còn 8 nhân viên. Chuyển nhân viên sang đơn vị khác rồi xóa, hoặc ngừng hoạt động đơn vị để giữ lại lịch sử.',
    );
    await userEvent.click(inDialog('Đóng'));
    await closed();
    expect(onlyEmployees.org.statusCalls).toEqual([]);
    onlyEmployees.unmount();

    const onlyChildren = await openUnit('KD', 'Phòng Kinh doanh', orgUnitApi());
    expect(await choose('Phòng Kinh doanh', 'Xóa đơn vị')).toHaveAccessibleDescription(
      'Đơn vị còn 2 đơn vị con. Chuyển đơn vị con sang đơn vị khác rồi xóa, hoặc ngừng hoạt động đơn vị để giữ lại lịch sử.',
    );
    onlyChildren.unmount();

    // Already inactive: no "or deactivate", and no button for it.
    const structure = orgStructure({ filled: true });
    structure.units.find((unit) => unit.code === 'KD')!.active = false;
    await openUnit('KD', 'Phòng Kinh doanh', orgUnitApi(structure));
    const dialog = await choose('Phòng Kinh doanh', 'Xóa đơn vị');
    expect(dialog).toHaveAccessibleDescription('Đơn vị còn 2 nhân viên và 2 đơn vị con. Chuyển nhân viên và đơn vị con sang đơn vị khác rồi xóa.');
    expect(names(within(dialog).getAllByRole('button'))).toEqual(['Đóng']);
  });

  it('a delete the server refuses (stale tree) turns into the blocked dialog with the counts of the answer', async () => {
    const org = orgUnitApi();
    const { unit } = await openUnit('WEB', 'Nhóm Web', org);
    server.use(http.delete('*/api/org-units/:id', () => problem(409, 'org_unit.not_empty', { employeeCount: 3, childCount: 1 })));
    await choose('Nhóm Web', 'Xóa đơn vị');
    await userEvent.click(inDialog('Xóa đơn vị'));

    const dialog = await screen.findByRole('dialog', { name: 'Không xóa được Nhóm Web' });
    expect(dialog).toHaveAccessibleDescription(
      'Đơn vị còn 3 nhân viên và 1 đơn vị con. Chuyển nhân viên và đơn vị con sang đơn vị khác rồi xóa, hoặc ngừng hoạt động đơn vị để giữ lại lịch sử.',
    );
    expect(names(within(dialog).getAllByRole('button'))).toEqual(['Đóng', 'Ngừng hoạt động']);
    await waitFor(() => expect(inDialog('Đóng')).toHaveFocus());
    // The unit is still there and still selected.
    expect(unit).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.click(inDialog('Ngừng hoạt động'));
    await closed();
    expect(org.statusCalls).toEqual([{ action: 'deactivate', id: unitId('WEB') }]);
  });

  it('while the call runs the button keeps its label, is disabled, and the dialog says it is busy', async () => {
    await openUnit('DATA', 'Nhóm Dữ liệu', orgUnitApi(orgStructure({ filled: true }), { delayMs: 150 }));
    const dialog = await choose('Nhóm Dữ liệu', 'Ngừng hoạt động');
    expect(dialog).not.toHaveAttribute('aria-busy');
    expect(within(dialog).getByRole('status')).toBeEmptyDOMElement();
    await userEvent.click(inDialog('Ngừng hoạt động'));
    expect(inDialog('Ngừng hoạt động')).toBeDisabled();
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Đang xử lý');
    await closed();
  });

  it('a unit that no longer exists: a danger toast, the dialog closes and the tree is reloaded', async () => {
    const org = orgUnitApi();
    await openUnit('WEB', 'Nhóm Web', org);
    await choose('Nhóm Web', 'Xóa đơn vị');
    // Someone else deleted it meanwhile.
    org.current().units = org.current().units.filter((unit) => unit.code !== 'WEB');
    await userEvent.click(inDialog('Xóa đơn vị'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không xóa được Nhóm WebĐơn vị này không còn tồn tại. Cây đơn vị đã được tải lại.');
    await closed();
    // The stale selection falls back to the company.
    expect(await detail(COMPANY_NAME)).toBeInTheDocument();
  });

  it('no permission or no network: a danger toast, and the dialog stays open', async () => {
    await openUnit('DATA', 'Nhóm Dữ liệu');
    server.use(http.post('*/api/org-units/:id/deactivate', () => problem(403, 'auth.forbidden')));
    await choose('Nhóm Dữ liệu', 'Ngừng hoạt động');
    await userEvent.click(inDialog('Ngừng hoạt động'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không ngừng hoạt động được Nhóm Dữ liệuBạn không có quyền thực hiện việc này.');
    expect(inDialog('Ngừng hoạt động')).toBeEnabled();

    server.use(http.post('*/api/org-units/:id/deactivate', () => HttpResponse.error()));
    await userEvent.click(inDialog('Ngừng hoạt động'));
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    expect(screen.getAllByRole('alert')[1]).toHaveTextContent('Không ngừng hoạt động được Nhóm Dữ liệuKiểm tra kết nối mạng rồi thử lại.');
    expect(screen.getByRole('dialog', { name: 'Ngừng hoạt động Nhóm Dữ liệu?' })).toBeInTheDocument();
  });

  it('a failed reactivation says so in a danger toast', async () => {
    const { unit } = await openUnit('GAME', 'Nhóm Game');
    server.use(http.post('*/api/org-units/:id/reactivate', () => problem(403, 'auth.forbidden')));
    await userEvent.click(within(unit).getByRole('button', { name: 'Kích hoạt lại' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kích hoạt lại được Nhóm GameBạn không có quyền thực hiện việc này.');
    expect(within(unit).getByRole('button', { name: 'Kích hoạt lại' })).toBeEnabled();
  });

  it('speaks English: menu, confirm with singular counts, blocked dialog', async () => {
    await i18n.changeLanguage('en');
    const structure = orgStructure({ filled: true });
    Object.assign(structure.units.find((unit) => unit.code === 'KD')!, { headcountDirect: 1 });
    structure.units.find((unit) => unit.code === 'MKT')!.active = false;
    server.use(...orgUnitApi(structure).handlers);
    renderRoutes(routes, { path: `/org?unit=${unitId('KD')}` });
    const unit = await detail('Phòng Kinh doanh');
    await userEvent.click(within(unit).getByRole('button', { name: 'More actions for Phòng Kinh doanh' }));
    const menu = await screen.findByRole('menu');
    expect(names(within(menu).getAllByRole('menuitem'))).toEqual(['Deactivate', 'Delete unit']);
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Deactivate' }));
    const confirm = await screen.findByRole('dialog', { name: 'Deactivate Phòng Kinh doanh?' });
    expect(confirm).toHaveAccessibleDescription(
      '1 employee stays in Phòng Kinh doanh until moved to another unit. 1 active child unit is not deactivated with it. The unit will no longer be offered when you add an employee or a unit. You can reactivate it at any time.',
    );
    await userEvent.click(inDialog('Cancel'));
    await closed();

    await userEvent.click(within(unit).getByRole('button', { name: 'More actions for Phòng Kinh doanh' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete unit' }));
    const blocked = await screen.findByRole('dialog', { name: 'Phòng Kinh doanh cannot be deleted' });
    expect(blocked).toHaveAccessibleDescription(
      'The unit still has 1 employee and 2 child units. Move the employees and child units to another unit, then delete it, or deactivate the unit to keep its history.',
    );
    expect(names(within(blocked).getAllByRole('button'))).toEqual(['Close', 'Deactivate']);
  });
});
