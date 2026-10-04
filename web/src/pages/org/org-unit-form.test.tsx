import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { problem } from '@/test/auth-handlers';
import { EMPTY_ORG, orgStructure, unitId } from '@/test/org-unit-fixtures';
import { orgUnitApi, orgUnitsOk } from '@/test/org-unit-handlers';
import { DIRECTOR_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const COMPANY_NAME = 'Công ty Cổ phần Công nghệ Mẫu';
const openPage = (path = '/org', session = HR_ACCOUNT) => renderRoutes(routes, { session, path });
const detail = (name: string) => screen.findByRole('region', { name });
const dialog = (name: string | RegExp = 'Thêm đơn vị') => screen.findByRole('dialog', { name });
const button = (name: string) => screen.getByRole('button', { name });
const textbox = (name: string) => screen.getByRole('textbox', { name });
const combobox = (name: string) => screen.getByRole('combobox', { name });

async function choose(field: string, option: string) {
  await userEvent.click(combobox(field));
  await userEvent.click(screen.getByRole('option', { name: option }));
}

async function fill(name: string, code: string, type?: string) {
  await userEvent.clear(textbox('Tên đơn vị'));
  await userEvent.type(textbox('Tên đơn vị'), name);
  await userEvent.clear(textbox('Mã đơn vị'));
  await userEvent.type(textbox('Mã đơn vị'), code);
  if (type) await choose('Loại', type);
}

describe('OrgPage: add and edit a unit', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('offers the actions that fit the selected node', async () => {
    server.use(...orgUnitApi().handlers);
    const { router } = openPage();
    const company = await detail(COMPANY_NAME);
    expect(button('Thêm đơn vị')).toBeInTheDocument();
    expect(within(company).getByRole('button', { name: 'Thêm đơn vị con' })).toBeInTheDocument();
    expect(within(company).queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();

    await router.navigate(`/org?unit=${unitId('QA')}`);
    const unit = await detail('Nhóm Kiểm thử');
    expect(within(unit).getAllByRole('button').map((item) => item.textContent)).toEqual(['Sửa', 'Thêm đơn vị con']);

    // Nothing is added under an inactive unit; it can still be edited.
    await router.navigate(`/org?unit=${unitId('GAME')}`);
    const inactive = await detail('Nhóm Game');
    expect(within(inactive).getAllByRole('button').map((item) => item.textContent)).toEqual(['Sửa']);
  });

  it('adds a unit under the company from the page button and selects it', async () => {
    const org = orgUnitApi();
    server.use(...org.handlers);
    const { router } = openPage();
    await detail(COMPANY_NAME);
    await userEvent.click(button('Thêm đơn vị'));

    const form = await dialog();
    expect(within(form).getByText('Đơn vị mới bắt đầu ở trạng thái Đang hoạt động.')).toBeInTheDocument();
    expect(textbox('Tên đơn vị')).toHaveFocus();
    expect(combobox('Đơn vị cha')).toHaveTextContent(COMPANY_NAME);
    expect(combobox('Loại')).toHaveTextContent('Chọn loại');
    expect(textbox('Mã đơn vị')).toHaveAccessibleDescription('2 đến 10 ký tự: chữ in hoa, số, gạch nối. Không trùng mã khác.');
    // Employees arrive with HRM-06: the head cannot be chosen yet.
    expect(combobox('Trưởng đơn vị')).toBeDisabled();
    expect(combobox('Trưởng đơn vị')).toHaveAccessibleDescription('Chọn được khi đã có hồ sơ nhân viên.');

    await fill('  Phòng Pháp chế ', 'pc-1', 'Phòng ban');
    await userEvent.click(button('Thêm đơn vị'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.writes).toEqual([{ method: 'POST', body: { name: 'Phòng Pháp chế', code: 'PC-1', type: 'DEPARTMENT', parentId: null, headEmployeeId: null } }]);
    expect(toastRegion()).toHaveTextContent(`Đã thêm Phòng Pháp chếThuộc ${COMPANY_NAME}`);
    const added = org.current().units.at(-1)!;
    expect(router.state.location.search).toBe(`?unit=${added.id}`);
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /^Phòng Pháp chế,/ })).toHaveAttribute('aria-selected', 'true'));
    expect(within(await detail('Phòng Pháp chế')).getByText('Phòng ban · PC-1')).toBeInTheDocument();
    expect(screen.getByText('20 đơn vị · 0 nhân viên')).toBeInTheDocument();
    await waitFor(() => expect(button('Thêm đơn vị')).toHaveFocus());
  });

  it('adds a child unit: the parent is prefilled and can be any active unit', async () => {
    const org = orgUnitApi();
    server.use(...org.handlers);
    openPage(`/org?unit=${unitId('PTPM')}`);
    await userEvent.click(within(await detail('Phòng Phát triển phần mềm')).getByRole('button', { name: 'Thêm đơn vị con' }));
    await dialog();
    expect(combobox('Đơn vị cha')).toHaveTextContent('Phòng Phát triển phần mềm');

    await userEvent.click(combobox('Đơn vị cha'));
    const options = screen.getAllByRole('option');
    // The company and the 19 active units, in tree order; the inactive Nhóm Game is not a choice.
    expect(options).toHaveLength(20);
    expect(options.slice(0, 3).map((option) => option.textContent)).toEqual([COMPANY_NAME, 'Phòng Phát triển phần mềm', 'Nhóm Web']);
    expect(screen.queryByRole('option', { name: 'Nhóm Game' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Phòng Phát triển phần mềm' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Nhóm Web' }));

    await fill('Nhóm Giao diện', 'ui', 'Nhóm');
    await userEvent.click(button('Thêm đơn vị'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.writes[0]!.body).toMatchObject({ code: 'UI', type: 'TEAM', parentId: unitId('WEB') });
    expect(toastRegion()).toHaveTextContent('Đã thêm Nhóm Giao diệnThuộc Nhóm Web');
    // The new unit is three levels down; the units above it are open.
    expect(await screen.findByRole('treeitem', { name: /^Nhóm Giao diện,/ })).toHaveAttribute('aria-level', '4');
  });

  it('prefills the page button with the selected unit only when it is active', async () => {
    server.use(...orgUnitApi().handlers);
    const { router } = openPage(`/org?unit=${unitId('KD')}`);
    await detail('Phòng Kinh doanh');
    await userEvent.click(button('Thêm đơn vị'));
    await dialog();
    expect(combobox('Đơn vị cha')).toHaveTextContent('Phòng Kinh doanh');
    await userEvent.click(button('Hủy'));

    await router.navigate(`/org?unit=${unitId('GAME')}`);
    await detail('Nhóm Game');
    await userEvent.click(button('Thêm đơn vị'));
    await dialog();
    expect(combobox('Đơn vị cha')).toHaveTextContent(COMPANY_NAME);
  });

  it('validates before sending and focuses the first invalid field', async () => {
    const org = orgUnitApi();
    server.use(...org.handlers);
    openPage();
    await detail(COMPANY_NAME);
    await userEvent.click(button('Thêm đơn vị'));
    await dialog();
    await userEvent.click(button('Thêm đơn vị'));

    expect(await screen.findByText('Nhập tên đơn vị.')).toBeInTheDocument();
    expect(textbox('Mã đơn vị')).toHaveAccessibleDescription('Nhập mã đơn vị.');
    expect(combobox('Loại')).toHaveAccessibleDescription('Chọn loại đơn vị.');
    expect(combobox('Loại')).toHaveAttribute('aria-invalid', 'true');
    expect(textbox('Tên đơn vị')).toHaveFocus();

    await fill('Phòng Pháp chế', 'p_c');
    await userEvent.tab();
    expect(textbox('Mã đơn vị')).toHaveValue('P_C');
    expect(textbox('Mã đơn vị')).toHaveAccessibleDescription('Mã đơn vị phải có 2 đến 10 ký tự, chỉ gồm chữ in hoa, số và gạch nối. Ví dụ: KD-HN.');
    await choose('Loại', 'Chi nhánh');
    expect(combobox('Loại')).not.toHaveAttribute('aria-invalid');
    expect(org.writes).toHaveLength(0);
  });

  it('names the unit that holds a duplicate code and keeps the dialog open', async () => {
    const org = orgUnitApi();
    server.use(...org.handlers);
    openPage(`/org?unit=${unitId('PTPM')}`);
    await userEvent.click(within(await detail('Phòng Phát triển phần mềm')).getByRole('button', { name: 'Thêm đơn vị con' }));
    await dialog();
    await fill('Nhóm Trí tuệ nhân tạo', 'qa', 'Nhóm');
    await userEvent.click(button('Thêm đơn vị'));

    expect(await screen.findByText('Mã QA đã dùng cho Nhóm Kiểm thử. Nhập mã khác.')).toHaveAttribute('role', 'alert');
    expect(textbox('Mã đơn vị')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(textbox('Mã đơn vị')).toHaveFocus());
    expect(screen.getByRole('dialog', { name: 'Thêm đơn vị' })).toBeInTheDocument();
    expect(within(toastRegion()).queryByText(/Nhóm Trí tuệ nhân tạo/)).not.toBeInTheDocument();

    // Correcting the code clears the message; the second try goes through.
    await userEvent.clear(textbox('Mã đơn vị'));
    await userEvent.type(textbox('Mã đơn vị'), 'AI');
    expect(screen.queryByText(/đã dùng cho/)).not.toBeInTheDocument();
    await userEvent.click(button('Thêm đơn vị'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(org.writes).toHaveLength(2);
    expect(toastRegion()).toHaveTextContent('Đã thêm Nhóm Trí tuệ nhân tạoThuộc Phòng Phát triển phần mềm');
  });

  it('edits name, code and type; the parent is read-only and the head is kept', async () => {
    const org = orgUnitApi(orgStructure({ filled: true }));
    server.use(...org.handlers);
    openPage(`/org?unit=${unitId('DATA')}`);
    const card = await detail('Nhóm Dữ liệu');
    await userEvent.click(within(card).getByRole('button', { name: 'Sửa' }));

    const form = await dialog('Sửa Nhóm Dữ liệu');
    expect(within(form).getByText('Trưởng đơn vị mặc định là Quản lý trực tiếp của nhân viên trong đơn vị.')).toBeInTheDocument();
    expect(textbox('Tên đơn vị')).toHaveValue('Nhóm Dữ liệu');
    expect(textbox('Mã đơn vị')).toHaveValue('DATA');
    expect(combobox('Loại')).toHaveTextContent('Nhóm');
    expect(combobox('Đơn vị cha')).toBeDisabled();
    expect(combobox('Đơn vị cha')).toHaveTextContent('Phòng Phát triển phần mềm');
    expect(combobox('Đơn vị cha')).toHaveAccessibleDescription('Dùng Chuyển đơn vị để đổi đơn vị cha.');
    expect(combobox('Trưởng đơn vị')).toBeDisabled();
    expect(combobox('Trưởng đơn vị')).toHaveTextContent('Tạ Quang Vinh');

    await fill('Phòng Dữ liệu và AI', 'dai', 'Phòng ban');
    await userEvent.click(button('Lưu thay đổi'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const headEmployeeId = orgStructure({ filled: true }).units.find((unit) => unit.code === 'DATA')!.head!.employeeId;
    expect(org.writes).toEqual([{ method: 'PUT', id: unitId('DATA'), body: { name: 'Phòng Dữ liệu và AI', code: 'DAI', type: 'DEPARTMENT', headEmployeeId } }]);
    expect(toastRegion()).toHaveTextContent('Đã lưu Phòng Dữ liệu và AI');
    expect(within(await detail('Phòng Dữ liệu và AI')).getByText('Phòng ban · DAI')).toBeInTheDocument();
    await waitFor(() => expect(button('Sửa')).toHaveFocus());
  });

  it('shows a duplicate code on edit, and closes on Cancel without saving', async () => {
    const org = orgUnitApi();
    server.use(...org.handlers);
    openPage(`/org?unit=${unitId('DATA')}`);
    await userEvent.click(within(await detail('Nhóm Dữ liệu')).getByRole('button', { name: 'Sửa' }));
    await dialog('Sửa Nhóm Dữ liệu');
    await fill('Nhóm Dữ liệu', 'QA');
    await userEvent.click(button('Lưu thay đổi'));
    expect(await screen.findByText('Mã QA đã dùng cho Nhóm Kiểm thử. Nhập mã khác.')).toBeInTheDocument();

    // Unsaved input is dropped without a confirm.
    await userEvent.click(button('Hủy'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(await detail('Nhóm Dữ liệu')).getByText('Nhóm · DATA')).toBeInTheDocument();
    await waitFor(() => expect(button('Sửa')).toHaveFocus());
  });

  it('keeps the label and disables the primary while saving', async () => {
    server.use(...orgUnitApi(orgStructure(), { delayMs: 80 }).handlers);
    openPage();
    await detail(COMPANY_NAME);
    await userEvent.click(button('Thêm đơn vị'));
    await dialog();
    await fill('Phòng Pháp chế', 'PC', 'Phòng ban');
    await userEvent.click(button('Thêm đơn vị'));
    await waitFor(() => expect(button('Thêm đơn vị')).toBeDisabled());
    expect(button('Hủy')).toBeEnabled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('puts server errors about the parent on its field and backend validation on the fields', async () => {
    server.use(orgUnitsOk(), http.post('*/api/org-units', () => problem(409, 'org_unit.parent_inactive')));
    openPage(`/org?unit=${unitId('KD')}`);
    await userEvent.click(within(await detail('Phòng Kinh doanh')).getByRole('button', { name: 'Thêm đơn vị con' }));
    await dialog();
    await fill('Nhóm Đối tác', 'DT', 'Nhóm');
    await userEvent.click(button('Thêm đơn vị'));
    expect(await screen.findByText('Đơn vị cha này đã ngừng hoạt động. Chọn đơn vị cha khác.')).toBeInTheDocument();
    await waitFor(() => expect(combobox('Đơn vị cha')).toHaveFocus());
    expect(combobox('Đơn vị cha')).toHaveAttribute('aria-invalid', 'true');

    server.use(http.post('*/api/org-units', () => problem(400, 'validation.invalid', { errors: [{ field: 'code', code: 'Pattern' }, { field: 'name', code: 'Size' }] })));
    await userEvent.click(button('Thêm đơn vị'));
    expect(await screen.findByText('Tên đơn vị quá dài. Dùng tối đa 150 ký tự.')).toBeInTheDocument();
    expect(textbox('Mã đơn vị')).toHaveAccessibleDescription(/^Mã đơn vị phải có 2 đến 10 ký tự/);
    await waitFor(() => expect(textbox('Tên đơn vị')).toHaveFocus());
  });

  it('reports a refused or failed save as a danger toast and stays open', async () => {
    server.use(orgUnitsOk(), http.post('*/api/org-units', () => problem(403, 'auth.forbidden')));
    openPage();
    await detail(COMPANY_NAME);
    await userEvent.click(button('Thêm đơn vị'));
    await dialog();
    await fill('Phòng Pháp chế', 'PC', 'Phòng ban');
    await userEvent.click(button('Thêm đơn vị'));
    expect(await within(toastRegion()).findByRole('alert')).toHaveTextContent('Không thêm được Phòng Pháp chếBạn không có quyền thực hiện việc này.');
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();

    server.use(http.post('*/api/org-units', () => HttpResponse.error()));
    await userEvent.click(button('Thêm đơn vị'));
    expect(await within(toastRegion()).findByText('Kiểm tra kết nối mạng rồi thử lại.')).toBeInTheDocument();
    expect(textbox('Tên đơn vị')).toHaveValue('Phòng Pháp chế');
  });

  it('offers the first unit from the empty state', async () => {
    const org = orgUnitApi(EMPTY_ORG);
    server.use(...org.handlers);
    openPage();
    expect(await screen.findByText(`Thêm phòng ban, chi nhánh hoặc nhóm đầu tiên dưới ${COMPANY_NAME}.`)).toBeInTheDocument();
    // The page-level button and, after it, the one of the empty state.
    const addButtons = screen.getAllByRole('button', { name: 'Thêm đơn vị' });
    expect(addButtons).toHaveLength(2);
    await userEvent.click(addButtons[1]!);
    await dialog();
    expect(combobox('Đơn vị cha')).toHaveTextContent(COMPANY_NAME);
    await fill('Phòng Hành chính', 'HC', 'Phòng ban');
    await userEvent.click(button('Thêm đơn vị'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /^Phòng Hành chính,/ })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.queryByRole('heading', { name: 'Chưa có đơn vị nào' })).not.toBeInTheDocument();
    // The empty-state button is gone: focus goes to the page-level one.
    await waitFor(() => expect(button('Thêm đơn vị')).toHaveFocus());
  });

  it('is view-only for a Director: no add or edit buttons, and the view-only empty state', async () => {
    server.use(orgUnitsOk(EMPTY_ORG));
    openPage('/org', DIRECTOR_ACCOUNT);
    expect(await screen.findByText(`Phòng ban, chi nhánh và nhóm dưới ${COMPANY_NAME} sẽ hiện ở đây.`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thêm đơn vị|Sửa/ })).not.toBeInTheDocument();
  });

  it('shows the dialog in English', async () => {
    await i18n.changeLanguage('en');
    server.use(...orgUnitApi().handlers);
    openPage(`/org?unit=${unitId('PTPM')}`);
    await userEvent.click(within(await detail('Phòng Phát triển phần mềm')).getByRole('button', { name: 'Add child unit' }));
    await dialog('Add unit');
    await userEvent.type(textbox('Unit name'), 'AI team');
    await userEvent.type(textbox('Unit code'), 'qa');
    await userEvent.click(combobox('Type'));
    await userEvent.click(screen.getByRole('option', { name: 'Team' }));
    await userEvent.click(button('Add unit'));
    expect(await screen.findByText('Code QA is already used by Nhóm Kiểm thử. Enter another code.')).toBeInTheDocument();
    expect(combobox('Unit head')).toHaveAccessibleDescription('Available once employee records exist.');
  });
});
