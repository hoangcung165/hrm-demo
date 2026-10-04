import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { orgStructure, unitId } from '@/test/org-unit-fixtures';
import { orgUnitApi } from '@/test/org-unit-handlers';
import { DIRECTOR_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const COMPANY_NAME = 'Công ty Cổ phần Công nghệ Mẫu';
const HINT = 'Không chuyển được vào chính đơn vị này hoặc đơn vị con của nó. Đơn vị ngừng hoạt động không hiện ở đây.';
const openPage = (path: string, session = HR_ACCOUNT) => renderRoutes(routes, { session, path });
const detail = (name: string) => screen.findByRole('region', { name });
const button = (name: string) => screen.getByRole('button', { name });
const picker = () => screen.getByRole('tree', { name: 'Đơn vị cha mới' });
const choice = (name: string) => within(picker()).getByRole('treeitem', { name });
const mainRow = (name: string) => within(screen.getByRole('tree', { name: 'Cây đơn vị' })).getByRole('treeitem', { name: new RegExp(`^${name},`) });
const moveFails = (status: number, code: string) => http.post('*/api/org-units/:id/move', () => problem(status, code));

/** Opens the page on a fixture unit and its move dialog. */
async function openMove(code: string, name: string, org = orgUnitApi(orgStructure({ filled: true }))) {
  server.use(...org.handlers);
  const view = openPage(`/org?unit=${unitId(code)}`);
  await userEvent.click(within(await detail(name)).getByRole('button', { name: 'Chuyển đơn vị' }));
  return { org, ...view, dialog: await screen.findByRole('dialog', { name: `Chuyển ${name}` }) };
}

describe('OrgPage: move a unit', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('shows the picker: the company and active units, with the reason on the rows that cannot be chosen', async () => {
    const { dialog } = await openMove('PMDN', 'Phòng Phần mềm Đà Nẵng');
    expect(dialog).toHaveAccessibleDescription('Chọn đơn vị cha mới. 30 nhân viên và 2 đơn vị con đi theo đơn vị này; Trưởng đơn vị không đổi.');
    expect(picker()).toBeRequired();
    expect(picker()).toHaveAccessibleDescription(HINT);

    // Everything is open: the company and the 19 active units. The inactive Nhóm Game is not listed.
    const rows = within(picker()).getAllByRole('treeitem');
    expect(rows).toHaveLength(20);
    expect(within(picker()).queryByRole('treeitem', { name: 'Nhóm Game' })).not.toBeInTheDocument();
    expect(rows.filter((row) => row.getAttribute('aria-checked') === 'true')).toEqual([]);
    const reasons = [['Chi nhánh Đà Nẵng', 'Đơn vị cha hiện tại'], ['Phòng Phần mềm Đà Nẵng', 'Đang chuyển'], ['Nhóm Web Đà Nẵng', 'Đơn vị con'], ['Nhóm Mobile Đà Nẵng', 'Đơn vị con']] as const;
    expect(rows.filter((row) => row.getAttribute('aria-disabled') === 'true')).toEqual(reasons.map(([name]) => choice(name)));
    for (const [name, reason] of reasons) expect(choice(name)).toHaveAccessibleDescription(reason);
    expect(choice('Phòng Kiểm thử Đà Nẵng')).toHaveAttribute('aria-level', '3');
    // Focus starts in the picker.
    expect(choice(COMPANY_NAME)).toHaveFocus();
  });

  it('moves the unit to another unit: toast, tree and detail updated, the unit still selected', async () => {
    const { org, router } = await openMove('PMDN', 'Phòng Phần mềm Đà Nẵng');
    // A disabled row is not a choice.
    await userEvent.click(choice('Chi nhánh Đà Nẵng'));
    expect(choice('Chi nhánh Đà Nẵng')).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(choice('Phòng Phát triển phần mềm'));
    expect(choice('Phòng Phát triển phần mềm')).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Chuyển đơn vị' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.writes).toEqual([{ method: 'POST', id: unitId('PMDN'), body: { parentId: unitId('PTPM') } }]);
    expect(toastRegion()).toHaveTextContent('Đã chuyển Phòng Phần mềm Đà NẵngTừ Chi nhánh Đà Nẵng sang Phòng Phát triển phần mềm');
    expect(router.state.location.search).toBe(`?unit=${unitId('PMDN')}`);
    const unit = await detail('Phòng Phần mềm Đà Nẵng');
    expect(within(unit).getByRole('link', { name: 'Phòng Phát triển phần mềm' })).toBeInTheDocument();
    expect(mainRow('Phòng Phần mềm Đà Nẵng')).toHaveAttribute('aria-selected', 'true');
    // Under its new parent, with its child units; the headcounts follow.
    expect(mainRow('Phòng Phần mềm Đà Nẵng')).toHaveAttribute('aria-level', '3');
    expect(mainRow('Nhóm Web Đà Nẵng')).toHaveAttribute('aria-level', '4');
    expect(mainRow('Phòng Phát triển phần mềm')).toHaveAccessibleName(/108 nhân viên$/);
    expect(mainRow('Chi nhánh Đà Nẵng')).toHaveAccessibleName(/14 nhân viên$/);
    await waitFor(() => expect(within(unit).getByRole('button', { name: 'Chuyển đơn vị' })).toHaveFocus());
  });

  it('moves the unit under the company, and opens a collapsed new parent so the unit stays in view', async () => {
    const { org } = await openMove('WEBDN', 'Nhóm Web Đà Nẵng');
    await userEvent.click(button('Hủy'));
    await userEvent.click(screen.getByTitle('Thu gọn Phòng Kinh doanh'));
    await userEvent.click(mainRow('Nhóm Web Đà Nẵng'));

    await userEvent.click(button('Chuyển đơn vị'));
    await screen.findByRole('dialog');
    await userEvent.click(choice('Phòng Kinh doanh'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Chuyển đơn vị' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mainRow('Nhóm Web Đà Nẵng')).toHaveAttribute('aria-level', '3');
    expect(mainRow('Phòng Kinh doanh')).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(button('Chuyển đơn vị'));
    await screen.findByRole('dialog');
    expect(choice('Phòng Kinh doanh')).toHaveAccessibleDescription('Đơn vị cha hiện tại');
    // By keyboard: the company is the first row.
    await userEvent.keyboard('{Home} {Tab}{Tab}{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.writes.at(-1)).toEqual({ method: 'POST', id: unitId('WEBDN'), body: { parentId: null } });
    expect(toastRegion()).toHaveTextContent(`Đã chuyển Nhóm Web Đà NẵngTừ Phòng Kinh doanh sang ${COMPANY_NAME}`);
    expect(mainRow('Nhóm Web Đà Nẵng')).toHaveAttribute('aria-level', '2');
    expect(mainRow('Nhóm Web Đà Nẵng')).toHaveAttribute('aria-selected', 'true');
  });

  it('asks for a target before sending; a top-level unit has the company as its current parent', async () => {
    const { org, dialog } = await openMove('CNDN', 'Chi nhánh Đà Nẵng');
    expect(dialog).toHaveAccessibleDescription('Chọn đơn vị cha mới. 44 nhân viên và 2 đơn vị con đi theo đơn vị này; Trưởng đơn vị không đổi.');
    expect(choice(COMPANY_NAME)).toHaveAccessibleDescription('Đơn vị cha hiện tại');
    expect(within(picker()).getAllByRole('treeitem').filter((row) => row.getAttribute('aria-disabled') === 'true')).toHaveLength(6);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Chuyển đơn vị' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Chọn đơn vị cha mới.');
    expect(picker()).toBeInvalid();
    expect(picker()).toHaveAccessibleDescription('Chọn đơn vị cha mới.');
    expect(picker()).toContainElement(document.activeElement as HTMLElement);
    expect(org.writes).toEqual([]);

    // Choosing clears the message.
    await userEvent.click(choice('Phòng Kinh doanh'));
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    expect(picker()).toHaveAccessibleDescription(HINT);
  });

  it('fits the wording to a unit with nothing under it', async () => {
    const { org, dialog } = await openMove('WEB', 'Nhóm Web', orgUnitApi());
    expect(dialog).toHaveAccessibleDescription('Chọn đơn vị cha mới. Trưởng đơn vị không đổi.');
    expect(choice('Nhóm Web')).toHaveAccessibleDescription('Đang chuyển');
    expect(choice('Phòng Phát triển phần mềm')).toHaveAccessibleDescription('Đơn vị cha hiện tại');
    await userEvent.click(choice('Phòng Kinh doanh'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chuyển đơn vị' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.current().units.find((unit) => unit.code === 'WEB')!.parentId).toBe(unitId('KD'));
  });

  it('offers no move button on an inactive unit (approved artboard: Kích hoạt lại, Sửa, more)', async () => {
    server.use(...orgUnitApi().handlers);
    openPage(`/org?unit=${unitId('GAME')}`);
    expect(within(await detail('Nhóm Game')).queryByRole('button', { name: 'Chuyển đơn vị' })).not.toBeInTheDocument();
  });

  it('names only what moves along: employees or child units', async () => {
    const { dialog } = await openMove('WEB', 'Nhóm Web');
    expect(dialog).toHaveAccessibleDescription('Chọn đơn vị cha mới. 24 nhân viên đi theo đơn vị này; Trưởng đơn vị không đổi.');
  });

  it('lists a unit under an inactive unit below the nearest listed ancestor', async () => {
    const structure = orgStructure();
    structure.units.find((unit) => unit.code === 'CNDN')!.active = false;
    const { dialog } = await openMove('WEB', 'Nhóm Web', orgUnitApi(structure));
    expect(dialog).toHaveAccessibleDescription('Chọn đơn vị cha mới. Trưởng đơn vị không đổi.');
    expect(within(picker()).queryByRole('treeitem', { name: 'Chi nhánh Đà Nẵng' })).not.toBeInTheDocument();
    expect(choice('Phòng Phần mềm Đà Nẵng')).toHaveAttribute('aria-level', '2');
    expect(choice('Phòng Phần mềm Đà Nẵng')).not.toHaveAttribute('aria-disabled');
  });

  it.each([
    ['org_unit.parent_inactive', 409, 'Đơn vị cha này đã ngừng hoạt động. Chọn đơn vị cha khác.'],
    ['org_unit.parent_not_found', 400, 'Đơn vị cha này không còn tồn tại. Chọn đơn vị cha khác.'],
    ['org_unit.move_into_self_or_descendant', 409, 'Không chuyển được vào chính đơn vị này hoặc đơn vị con của nó. Chọn đơn vị cha khác.'],
  ])('shows %s under the picker and keeps the dialog open', async (code, status, message) => {
    const { dialog } = await openMove('QA', 'Nhóm Kiểm thử');
    server.use(moveFails(status, code));
    await userEvent.click(choice('Phòng Kinh doanh'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chuyển đơn vị' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(message);
    expect(picker()).toHaveAccessibleDescription(message);
    expect(picker()).toContainElement(document.activeElement as HTMLElement);
    expect(toastRegion()).toBeEmptyDOMElement();
  });

  it('answers the real 409 of a target that went inactive: the reloaded picker no longer lists it', async () => {
    const { org, dialog } = await openMove('QA', 'Nhóm Kiểm thử');
    // Someone else deactivated the target after the tree was loaded.
    org.current().units.find((unit) => unit.code === 'KD')!.active = false;
    await userEvent.click(choice('Phòng Kinh doanh'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chuyển đơn vị' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Đơn vị cha này đã ngừng hoạt động.');
    await waitFor(() => expect(within(picker()).queryByRole('treeitem', { name: 'Phòng Kinh doanh' })).not.toBeInTheDocument());
    expect(within(picker()).getAllByRole('treeitem').filter((row) => row.getAttribute('aria-checked') === 'true')).toEqual([]);
    expect(org.current().units.find((unit) => unit.code === 'QA')!.parentId).toBe(unitId('PTPM'));
  });

  it('shows other failures as a toast; a unit that is gone closes the dialog', async () => {
    const { dialog } = await openMove('QA', 'Nhóm Kiểm thử');
    server.use(moveFails(500, 'error.unknown'));
    await userEvent.click(choice('Phòng Kinh doanh'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chuyển đơn vị' }));
    expect(await within(toastRegion()).findByRole('alert')).toHaveTextContent('Không chuyển được Nhóm Kiểm thử');
    expect(dialog).toBeInTheDocument();
    expect(choice('Phòng Kinh doanh')).toHaveAttribute('aria-checked', 'true');

    server.use(moveFails(404, 'org_unit.not_found'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chuyển đơn vị' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toastRegion()).toHaveTextContent('Đơn vị này không còn tồn tại. Cây đơn vị đã được tải lại.');
  });

  it('keeps the button label and disables it while the move runs', async () => {
    const { dialog } = await openMove('QA', 'Nhóm Kiểm thử', orgUnitApi(orgStructure(), { delayMs: 80 }));
    await userEvent.click(choice('Phòng Kinh doanh'));
    const submit = within(dialog).getByRole('button', { name: 'Chuyển đơn vị' });
    await userEvent.click(submit);
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent('Chuyển đơn vị');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('offers no move to an Account without ORG_EDIT, nor on the company', async () => {
    server.use(...orgUnitApi().handlers);
    const { unmount } = openPage(`/org?unit=${unitId('QA')}`, DIRECTOR_ACCOUNT);
    expect(within(await detail('Nhóm Kiểm thử')).queryByRole('button')).not.toBeInTheDocument();
    unmount();
    openPage('/org');
    expect(within(await detail(COMPANY_NAME)).queryByRole('button', { name: 'Chuyển đơn vị' })).not.toBeInTheDocument();
  });

  it('shows the dialog in English, with plurals', async () => {
    await i18n.changeLanguage('en');
    server.use(...orgUnitApi(orgStructure({ filled: true })).handlers);
    openPage(`/org?unit=${unitId('PMDN')}`);
    await userEvent.click(within(await detail('Phòng Phần mềm Đà Nẵng')).getByRole('button', { name: 'Move unit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Move Phòng Phần mềm Đà Nẵng' });
    expect(dialog).toHaveAccessibleDescription('Choose the new parent unit. 30 employees and 2 child units will move with this unit; the unit head stays the same.');
    const tree = within(dialog).getByRole('tree', { name: 'New parent unit' });
    expect(within(tree).getByRole('treeitem', { name: 'Chi nhánh Đà Nẵng' })).toHaveAccessibleDescription('Current parent unit');
    await userEvent.click(within(tree).getByRole('treeitem', { name: COMPANY_NAME }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move unit' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toastRegion()).toHaveTextContent(`Phòng Phần mềm Đà Nẵng movedFrom Chi nhánh Đà Nẵng to ${COMPANY_NAME}`);
  });
});
