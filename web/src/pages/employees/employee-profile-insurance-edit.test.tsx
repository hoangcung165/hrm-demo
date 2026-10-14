import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import type { Insurance } from '@/features/employee/profile-records-api';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const url = '*/api/employees/:employeeId/insurance';
const HR: Account = {
  ...HR_ACCOUNT,
  permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT', 'EMPLOYEE_SENSITIVE_VIEW'],
};
let record: Insurance;
let writes: Record<string, unknown>[];
let errorStatus = 0;

function setup(account: Account = HR) {
  server.use(
    http.get(url, () => HttpResponse.json(record)),
    http.put(url, async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      writes.push(body);
      if (errorStatus) return HttpResponse.json({ code: 'employee.invalid_field' }, { status: errorStatus });
      record = { ...record, ...body, masked: false } as Insurance;
      return HttpResponse.json(record);
    }),
    employeeProfileApi().handler,
    employeeListApi().handler,
    ...catalogApi().handlers,
    orgUnitsOk(),
  );
  return renderRoutes(routes, { session: account, path: `/employees/${id}?tab=insurance` });
}

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('vi');
  record = { socialInsuranceNumber: '0194000007', participationDate: '2021-04-15',
    healthRegistrationPlace: 'Bệnh viện Quận 7', healthInsuranceNumber: 'DN4012345678', masked: false };
  writes = [];
  errorStatus = 0;
});

describe('HRM-08/FE-2B insurance editor', () => {
  it('updates only editable insurance fields, preserves the identity number and refreshes the card', async () => {
    setup();
    const card = await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' });
    await userEvent.click(within(card).getByRole('button', { name: 'Sửa thông tin BHXH/BHYT' }));
    const dialog = screen.getByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' });
    expect(within(dialog).queryByLabelText('Số sổ BHXH')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Lương đóng BH')).not.toBeInTheDocument();
    expect(within(dialog).getAllByText(/Giấy tờ định danh/).length).toBeGreaterThan(0);
    fireEvent.change(within(dialog).getByLabelText('Ngày tham gia'), { target: { value: '2022-03-12' } });
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Nơi đăng ký khám chữa bệnh' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Nơi đăng ký khám chữa bệnh' }), 'Bệnh viện mới');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thông tin bảo hiểm' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' })).not.toBeInTheDocument());
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({
      participationDate: '2022-03-12', healthRegistrationPlace: 'Bệnh viện mới', healthInsuranceNumber: 'DN4012345678',
    });
    expect(writes[0]).not.toHaveProperty('socialInsuranceNumber');
    expect(within(await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' }))
      .getByText('12/03/2022')).toBeInTheDocument();
  });

  it('allows setting empty insurance details but does not edit the social number', async () => {
    record = { socialInsuranceNumber: null, participationDate: null, healthRegistrationPlace: null,
      healthInsuranceNumber: null, masked: false };
    setup();
    expect(await screen.findByRole('heading', { name: 'Chưa có thông tin bảo hiểm' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Bổ sung thông tin bảo hiểm' }));
    const dialog = screen.getByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Nơi đăng ký khám chữa bệnh' }), 'Bệnh viện mới');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thông tin bảo hiểm' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({
      participationDate: null, healthRegistrationPlace: 'Bệnh viện mới', healthInsuranceNumber: null,
    });
  });

  it('keeps the dialog open with an error when backend rejects a write, then allows retry', async () => {
    setup();
    await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' });
    await userEvent.click(screen.getByRole('button', { name: 'Sửa thông tin BHXH/BHYT' }));
    errorStatus = 400;
    const dialog = screen.getByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thông tin bảo hiểm' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Thông tin bảo hiểm không hợp lệ');
    errorStatus = 0;
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thông tin bảo hiểm' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' })).not.toBeInTheDocument());
    expect(writes).toHaveLength(2);
  });

  it('never presents write controls to an employee-view only role or a masked API record', async () => {
    const readOnly: Account = { ...HR, permissions: ['EMPLOYEE_VIEW'] };
    setup(readOnly);
    await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' });
    expect(screen.queryByRole('button', { name: 'Sửa thông tin BHXH/BHYT' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bổ sung thông tin bảo hiểm' })).not.toBeInTheDocument();
  });

  it('warns before changing tab with unsaved insurance changes', async () => {
    setup();
    await screen.findByRole('region', { name: 'Thông tin BHXH và BHYT' });
    await userEvent.click(screen.getByRole('button', { name: 'Sửa thông tin BHXH/BHYT' }));
    fireEvent.change(screen.getByLabelText('Ngày tham gia'), { target: { value: '2022-01-01' } });
    await userEvent.click(screen.getByRole('tab', { name: 'Ngân hàng' }));
    const leave = await screen.findByRole('dialog', { name: 'Bỏ thay đổi chưa lưu?' });
    expect(within(leave).getByText(/thay đổi thông tin bảo hiểm/)).toBeInTheDocument();
    await userEvent.click(within(leave).getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('dialog', { name: 'Chỉnh sửa thông tin BHXH/BHYT' })).toBeInTheDocument();
  });
});
