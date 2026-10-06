import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { ADMIN_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const open = (search = '', session: Account = ADMIN_ACCOUNT) => {
  const api = catalogApi();
  server.use(...api.handlers);
  return { api, ...renderRoutes(routes, { session, path: `/catalogs${search}` }) };
};
const table = async (name: string) => {
  const found = await screen.findByRole('table', { name });
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Đang tải danh mục' })).not.toBeInTheDocument());
  return found;
};
const dialog = (name: string | RegExp) => screen.findByRole('dialog', { name });
const field = (form: HTMLElement, name: RegExp) => within(form).getByLabelText(name);
const button = (form: HTMLElement, name: string) => within(form).getByRole('button', { name });
const setDate = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
/** The error or helper line of a field: what its `aria-describedby` points at. */
const noteOf = (control: HTMLElement) => document.getElementById(control.getAttribute('aria-describedby')!.split(' ')[0]!)!;

async function openEdit(tab: string, name: string) {
  await table(tab);
  await userEvent.click(screen.getByRole('button', { name: `Thao tác cho ${name}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Sửa' }));
  return dialog(new RegExp(`^Sửa .*: ${name}$`));
}

describe('CatalogsPage: add and edit', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('offers "Thêm {mục}" for the open tab and a row menu only with CATALOG_EDIT', async () => {
    const readOnly = open('', HR_ACCOUNT);
    expect(within(await table('Chức danh')).getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /^Thêm |^Thao tác cho/ })).not.toBeInTheDocument();
    readOnly.unmount();

    open();
    const headers = within(await table('Chức danh')).getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    expect(headers[3]).toHaveTextContent('Thao tác');
    expect(screen.getAllByRole('button', { name: /^Thao tác cho/ })).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Thêm chức danh' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Ngày lễ' }));
    expect(screen.getByRole('button', { name: 'Thêm ngày lễ' })).toBeInTheDocument();
  });

  it('adds a position: code and name required, the code upper-cased, then a toast and the new row', async () => {
    const { api } = open();
    await table('Chức danh');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm chức danh' }));
    const form = await dialog('Thêm chức danh');
    expect(field(form, /^Mã/)).toHaveFocus();
    expect(noteOf(field(form, /^Mã/))).toHaveTextContent('2–20 ký tự: chữ không dấu, số, "-" hoặc "_". Tự viết hoa.');

    await userEvent.click(button(form, 'Thêm chức danh'));
    expect(noteOf(field(form, /^Mã/))).toHaveTextContent('Nhập mã.');
    expect(noteOf(field(form, /^Tên/))).toHaveTextContent('Nhập tên.');
    expect(field(form, /^Mã/)).toHaveFocus();
    await userEvent.type(field(form, /^Mã/), 'tn đ');
    await userEvent.tab();
    expect(noteOf(field(form, /^Mã/))).toHaveTextContent('Mã gồm 2–20 ký tự: chữ không dấu, số, "-" hoặc "_".');
    await userEvent.clear(field(form, /^Mã/));
    await userEvent.type(field(form, /^Mã/), 'tn_1');
    await userEvent.type(field(form, /^Tên/), '  Trưởng nhóm ');
    await userEvent.click(button(form, 'Thêm chức danh'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes).toEqual([
      { method: 'POST', catalog: 'positions', body: { code: 'TN_1', name: 'Trưởng nhóm', term: null, maxMonths: null, insurable: null, taxable: null, startDate: null, endDate: null } },
    ]);
    expect(within(toastRegion()).getByText('Đã thêm Trưởng nhóm')).toBeInTheDocument();
    expect(await within(await table('Chức danh')).findByText('Trưởng nhóm')).toBeInTheDocument();
  });

  it('shows a code or a name already in the catalog under its field, and keeps the dialog open', async () => {
    open('?catalog=skills');
    await screen.findByRole('heading', { name: 'Chưa có kỹ năng nào' });
    // The empty catalog offers the add twice: in the header and in its empty state. This is the header's.
    await userEvent.click(screen.getAllByRole('button', { name: 'Thêm kỹ năng' })[0]!);
    const form = await dialog('Thêm kỹ năng');
    await userEvent.type(field(form, /^Mã/), 'REACT');
    await userEvent.type(field(form, /^Tên/), 'React');
    await userEvent.click(button(form, 'Thêm kỹ năng'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Thêm kỹ năng' }));
    const again = await dialog('Thêm kỹ năng');
    await userEvent.type(field(again, /^Mã/), 'react');
    await userEvent.type(field(again, /^Tên/), 'react js');
    await userEvent.click(button(again, 'Thêm kỹ năng'));
    expect(await within(again).findByText('Mã này đã có trong danh mục. Nhập một mã khác.')).toBeInTheDocument();
    expect(field(again, /^Mã/)).toHaveFocus();

    await userEvent.clear(field(again, /^Mã/));
    await userEvent.type(field(again, /^Mã/), 'REACT_JS');
    await userEvent.clear(field(again, /^Tên/));
    await userEvent.type(field(again, /^Tên/), 'reáct');
    await userEvent.click(button(again, 'Thêm kỹ năng'));
    expect(await within(again).findByText('Tên này đã có trong danh mục (React). Nhập một tên khác.')).toBeInTheDocument();
    expect(field(again, /^Tên/)).toHaveFocus();
  });

  it('edits a contract type: nothing to save until a field changes, the maximum only for a fixed term', async () => {
    const { api } = open('?catalog=contract-types');
    const form = await openEdit('Loại hợp đồng', 'HĐLĐ xác định thời hạn');
    expect(form).toHaveAccessibleName('Sửa loại hợp đồng: HĐLĐ xác định thời hạn');
    expect(button(form, 'Lưu thay đổi')).toBeDisabled();
    expect(within(form).getByRole('radio', { name: 'Xác định thời hạn' })).toBeChecked();
    expect(field(form, /^Tối đa \(tháng\)/)).toHaveValue('36');

    await userEvent.clear(field(form, /^Tối đa \(tháng\)/));
    await userEvent.type(field(form, /^Tối đa \(tháng\)/), '37');
    await userEvent.click(button(form, 'Lưu thay đổi'));
    expect(noteOf(field(form, /^Tối đa \(tháng\)/))).toHaveTextContent('Nhập số tháng từ 1 đến 36.');
    await userEvent.clear(field(form, /^Tối đa \(tháng\)/));
    await userEvent.type(field(form, /^Tối đa \(tháng\)/), '24');
    await userEvent.click(button(form, 'Lưu thay đổi'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes.at(-1)).toMatchObject({ method: 'PUT', catalog: 'contract-types', body: { code: 'XDTH', term: 'FIXED', maxMonths: 24 } });
    expect(within(toastRegion()).getByText('Đã lưu HĐLĐ xác định thời hạn')).toBeInTheDocument();

    const probation = await openEdit('Loại hợp đồng', 'HĐLĐ xác định thời hạn');
    await userEvent.click(within(probation).getByRole('radio', { name: 'Thử việc' }));
    expect(within(probation).queryByLabelText(/^Tối đa/)).not.toBeInTheDocument();
    await userEvent.click(button(probation, 'Lưu thay đổi'));
    await waitFor(() => expect(api.writes.at(-1)).toMatchObject({ method: 'PUT', body: { term: 'PROBATION', maxMonths: null } }));
  });

  it('adds an allowance type with its payroll flags', async () => {
    const { api } = open('?catalog=allowance-types');
    await table('Loại phụ cấp');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm loại phụ cấp' }));
    const form = await dialog('Thêm loại phụ cấp');
    expect(within(form).getByRole('checkbox', { name: 'Tính BHXH' })).not.toBeChecked();
    expect(within(form).getByRole('checkbox', { name: 'Chịu thuế TNCN' })).toBeChecked();
    expect(within(form).getByText('Mặc định cho bảng lương. Đổi ở đây không làm thay đổi phiếu lương đã chốt.')).toBeInTheDocument();
    await userEvent.type(field(form, /^Mã/), 'TRACH_NHIEM');
    await userEvent.type(field(form, /^Tên/), 'Phụ cấp trách nhiệm');
    await userEvent.click(within(form).getByRole('checkbox', { name: 'Tính BHXH' }));
    await userEvent.click(button(form, 'Thêm loại phụ cấp'));
    await waitFor(() => expect(api.writes).toHaveLength(1));
    expect(api.writes[0]).toMatchObject({ body: { code: 'TRACH_NHIEM', insurable: true, taxable: true, term: null, startDate: null } });
  });

  it('adds a holiday: both dates, at most 10 days, not over another holiday', async () => {
    const { api } = open('?catalog=holidays&year=2026');
    await table('Ngày lễ');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm ngày lễ' }));
    const form = await dialog('Thêm ngày lễ');
    expect(within(form).queryByLabelText(/^Mã/)).not.toBeInTheDocument();
    expect(field(form, /^Tên/)).toHaveFocus();
    const from = field(form, /^Từ ngày/);
    const to = field(form, /^Đến ngày/);
    expect(noteOf(from)).toHaveTextContent('Tối đa 10 ngày liên tiếp, tính cả hai đầu.');

    await userEvent.type(field(form, /^Tên/), 'Nghỉ thêm dịp Tết');
    await userEvent.click(button(form, 'Thêm ngày lễ'));
    expect(noteOf(from)).toHaveTextContent('Chọn ngày bắt đầu.');
    expect(from).toHaveAttribute('aria-invalid', 'true');

    setDate(from, '2026-03-10');
    setDate(to, '2026-03-09');
    await userEvent.click(button(form, 'Thêm ngày lễ'));
    await waitFor(() => expect(noteOf(from)).toHaveTextContent('Đến ngày phải bằng hoặc sau Từ ngày.'));
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAttribute('aria-invalid', 'true');

    setDate(to, '2026-03-20');
    await userEvent.click(button(form, 'Thêm ngày lễ'));
    await waitFor(() => expect(noteOf(to)).toHaveTextContent('Ngày lễ dài tối đa 10 ngày liên tiếp. Chọn Đến ngày sớm hơn.'));
    expect(api.writes).toHaveLength(0);

    setDate(from, '2026-02-20');
    setDate(to, '2026-02-23');
    await userEvent.click(button(form, 'Thêm ngày lễ'));
    expect(await within(form).findByText('Trùng với ngày lễ Tết Nguyên đán (16/02 – 20/02/2026). Chọn ngày khác.')).toBeInTheDocument();

    setDate(from, '2026-02-21');
    await userEvent.click(button(form, 'Thêm ngày lễ'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.writes.at(-1)).toEqual({
      method: 'POST',
      catalog: 'holidays',
      body: { code: null, name: 'Nghỉ thêm dịp Tết', term: null, maxMonths: null, insurable: null, taxable: null, startDate: '2026-02-21', endDate: '2026-02-23' },
    });
    expect(within(toastRegion()).getByText('Đã thêm Nghỉ thêm dịp Tết')).toBeInTheDocument();
  });

  it('adds from the empty state of a catalog', async () => {
    open('?catalog=skills');
    await screen.findByRole('heading', { name: 'Chưa có kỹ năng nào' });
    const adds = screen.getAllByRole('button', { name: 'Thêm kỹ năng' });
    expect(adds).toHaveLength(2);
    await userEvent.click(adds[1]!);
    expect(await dialog('Thêm kỹ năng')).toBeInTheDocument();
  });
});
