import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { BankAccount, Dependent } from '@/features/employee/profile-records-api';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const bankPath = '*/api/employees/:employeeId/bank-accounts';
const dependentPath = '*/api/employees/:employeeId/dependents';
const HR: Account = { ...HR_ACCOUNT,
  permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'] };
let banks: BankAccount[] = [];
let dependents: Dependent[] = [];
let bankPosts = 0;
let bankPuts = 0;
let bankDeletes = 0;
let dependentWrites = 0;

const handlers = [
  http.get(bankPath, () => HttpResponse.json(banks)),
  http.post(bankPath, async ({ request }) => {
    bankPosts++;
    const body = await request.json() as Omit<BankAccount, 'id' | 'masked'>;
    const next: BankAccount = { ...body, id: 'bank-' + bankPosts, masked: false,
      defaultAccount: body.defaultAccount || !banks.length };
    if (next.defaultAccount) banks = banks.map(b => ({ ...b, defaultAccount: false }));
    banks.push(next);
    return HttpResponse.json(next, { status: 201 });
  }),
  http.put(bankPath + '/:bankId', async ({ params, request }) => {
    bankPuts++;
    const body = await request.json() as Omit<BankAccount, 'id' | 'masked'>;
    if (body.accountNumber.includes('•')) return HttpResponse.json({}, { status: 400 });
    if (body.defaultAccount) banks = banks.map(b => ({ ...b, defaultAccount: false }));
    banks = banks.map(b => b.id === params.bankId ? { ...b, ...body, masked: false } : b);
    return HttpResponse.json(banks.find(b => b.id === params.bankId));
  }),
  http.delete(bankPath + '/:bankId', ({ params }) => {
    bankDeletes++;
    banks = banks.filter(b => b.id !== params.bankId);
    if (banks.length && !banks.some(b => b.defaultAccount)) banks[0]!.defaultAccount = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(dependentPath, () => HttpResponse.json(dependents)),
  http.post(dependentPath, async ({ request }) => {
    dependentWrites++;
    const body = await request.json() as Omit<Dependent, 'id'>;
    const next = { ...body, id: 'dependent-' + dependentWrites };
    dependents.push(next);
    return HttpResponse.json(next, { status: 201 });
  }),
  http.put(dependentPath + '/:recordId', async ({ request, params }) => {
    dependentWrites++;
    const body = await request.json() as Omit<Dependent, 'id'>;
    dependents = dependents.map(d => d.id === params.recordId ? { ...d, ...body } : d);
    return HttpResponse.json(dependents.find(d => d.id === params.recordId));
  }),
  http.delete(dependentPath + '/:recordId', ({ params }) => {
    dependentWrites++;
    dependents = dependents.filter(d => d.id !== params.recordId);
    return new HttpResponse(null, { status: 204 });
  }),
];

function open(tab: 'bank' | 'dependents', session: Account = HR) {
  server.use(...handlers, employeeProfileApi().handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk());
  return renderRoutes(routes, { session, path: `/employees/${id}?tab=${tab}` });
}

describe('HRM-08 FE-2A write forms', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
    banks = [{ id: 'bank-main', bankName: 'Vietcombank', accountNumber: '1234567890',
      accountHolder: 'Lê Văn Hùng', defaultAccount: true, masked: false }];
    dependents = [{ id: 'dependent-old', fullName: 'Lê Minh An', relationship: 'Con',
      dateOfBirth: '2018-01-01', effectiveFrom: '2020-01-01', effectiveTo: null }];
    bankPosts = 0; bankPuts = 0; bankDeletes = 0; dependentWrites = 0;
  });

  it('creates a bank and switches the default without submitting a masked value', async () => {
    open('bank');
    await screen.findByRole('region', { name: 'Vietcombank' });
    await userEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản ngân hàng' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm tài khoản ngân hàng' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Ngân hàng' }), 'ACB');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Chủ tài khoản' }), 'Lê Văn Hùng');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tài khoản' }), '0987654321');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thêm tài khoản ngân hàng' })).not.toBeInTheDocument());
    expect(bankPosts).toBe(1);
    const acb = await screen.findByRole('region', { name: 'ACB' });
    await userEvent.click(within(acb).getByRole('button', { name: 'Đặt mặc định' }));
    await waitFor(() => expect(within(acb).getByText('Tài khoản nhận lương')).toBeInTheDocument());
    expect(bankPuts).toBe(1);
    expect(banks.find(b => b.id === 'bank-main')?.defaultAccount).toBe(false);
  });

  it('deletes a bank only after confirmation', async () => {
    open('bank');
    const existing = await screen.findByRole('region', { name: 'Vietcombank' });
    await userEvent.click(within(existing).getByRole('button', { name: 'Xóa Vietcombank?' }));
    expect(bankDeletes).toBe(0);
    await userEvent.click(screen.getByRole('dialog', { name: 'Xóa Vietcombank?' })
      .querySelector('button')!); // Cancel is first
    expect(bankDeletes).toBe(0);
    await userEvent.click(within(existing).getByRole('button', { name: 'Xóa Vietcombank?' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Xóa Vietcombank?' }))
      .getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(bankDeletes).toBe(1));
    expect(await screen.findByRole('heading', { name: 'Chưa có tài khoản ngân hàng' })).toBeInTheDocument();
  });

  it('creates and edits dependents, validating effective date order before API writes', async () => {
    open('dependents');
    await screen.findByRole('region', { name: 'Lê Minh An' });
    await userEvent.click(screen.getByRole('button', { name: 'Thêm người phụ thuộc' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm người phụ thuộc' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Họ và tên' }), 'Nguyễn Thị Mai');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Quan hệ' }), 'Mẹ');
    await userEvent.type(within(dialog).getByLabelText('Hiệu lực từ'), '2026-02-01');
    await userEvent.type(within(dialog).getByLabelText('Hiệu lực đến'), '2025-02-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Ngày kết thúc không được trước ngày bắt đầu.');
    expect(dependentWrites).toBe(0);
    await userEvent.clear(within(dialog).getByLabelText('Hiệu lực đến'));
    await userEvent.type(within(dialog).getByLabelText('Hiệu lực đến'), '2027-01-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(dependentWrites).toBe(1));
    const created = await screen.findByRole('region', { name: 'Nguyễn Thị Mai' });
    await userEvent.click(within(created).getByRole('button', { name: 'Sửa Nguyễn Thị Mai' }));
    const edited = screen.getByRole('dialog', { name: 'Sửa người phụ thuộc' });
    await userEvent.clear(within(edited).getByRole('textbox', { name: 'Quan hệ' }));
    await userEvent.type(within(edited).getByRole('textbox', { name: 'Quan hệ' }), 'Mẹ ruột');
    await userEvent.click(within(edited).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(dependentWrites).toBe(2));
    expect(within(await screen.findByRole('region', { name: 'Nguyễn Thị Mai' })).getByText('Mẹ ruột')).toBeInTheDocument();
  });

  it('hides all write actions for non-editors and masked bank account records', async () => {
    const viewer: Account = { ...HR, permissions: ['EMPLOYEE_VIEW'] };
    open('bank', viewer);
    const bank = await screen.findByRole('region', { name: 'Vietcombank' });
    expect(within(bank).queryByRole('button', { name: /Sửa|Xóa|Đặt mặc định/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm tài khoản ngân hàng' })).not.toBeInTheDocument();
  });
});
