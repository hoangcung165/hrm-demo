import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/app';
import type { Account } from '@/features/auth/account';
import i18n from '@/i18n';
import { approvalApi } from '@/test/approval-handlers';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeListApi } from '@/test/employee-handlers';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { ACCEPTED, checkinApi, WITHDRAWN, type CheckinApiOptions } from '@/test/mobile-checkin-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { EMPLOYEE_ACCOUNT, HR_ACCOUNT, renderRoutes, toastRegion } from '@/test/render';
import { server } from '@/test/server';

const OWN = employeeId(22);
const ME: Account = { ...EMPLOYEE_ACCOUNT, employeeId: OWN };
const HR: Account = { ...HR_ACCOUNT, permissions: [...HR_ACCOUNT.permissions, 'EMPLOYEE_VIEW', 'EMPLOYEE_EDIT'], employeeId: employeeId(3) };
const section = () => screen.findByRole('region', { name: 'Chấm công bằng điện thoại' });

function open(options: CheckinApiOptions = {}, session: Account = ME, id = OWN) {
  const api = checkinApi(options);
  server.use(...api.handlers, employeeProfileApi({ ownId: OWN }).handler, employeeListApi().handler, ...catalogApi().handlers, orgUnitsOk(),
    ...approvalApi({ inbox: { WAITING: [], SENT: [], HANDLED: [] } }).handlers);
  return { api, ...renderRoutes(routes, { session, path: `/employees/${id}` }) };
}

describe('Chấm công bằng điện thoại on the own profile', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('shows the consent in force with its date', async () => {
    open({ consent: ACCEPTED });
    const card = await section();
    await within(card).findByText('Đã đồng ý');
    expect(card).toHaveTextContent('Bạn đã đồng ý cho công ty dùng vị trí và ảnh khi chấm công, ngày 02/11/2026.');
  });

  it('withdraws it after a confirmation; check-in then needs the consent again', async () => {
    const user = userEvent.setup();
    const { api } = open({ consent: ACCEPTED });
    const card = await section();
    await user.click(await within(card).findByRole('button', { name: 'Rút lại đồng ý' }));
    const dialog = screen.getByRole('dialog', { name: 'Rút lại đồng ý chấm công bằng điện thoại?' });
    expect(dialog).toHaveTextContent('Các lần quẹt đã lưu vẫn giữ nguyên.');
    await user.click(within(dialog).getByRole('button', { name: 'Rút lại đồng ý' }));
    expect(await within(toastRegion()).findByText('Đã rút lại đồng ý chấm công bằng điện thoại')).toBeInTheDocument();
    await within(card).findByText('Chưa đồng ý');
    expect(card).toHaveTextContent('Bạn đã rút lại đồng ý ngày 04/11/2026.');
    expect(within(card).getByRole('link', { name: 'Xem và đồng ý' })).toHaveAttribute('href', '/checkin');
    expect(api.withdrawals()).toBe(1);
  });

  it('keeps the consent when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const { api } = open({ consent: ACCEPTED });
    const card = await section();
    await user.click(await within(card).findByRole('button', { name: 'Rút lại đồng ý' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(card).getByText('Đã đồng ý')).toBeInTheDocument();
    expect(api.withdrawals()).toBe(0);
  });

  it('says so when withdrawing fails, and the consent stays', async () => {
    const user = userEvent.setup();
    open({ consent: ACCEPTED, failWithdraw: true });
    const card = await section();
    await user.click(await within(card).findByRole('button', { name: 'Rút lại đồng ý' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rút lại đồng ý' }));
    expect(await within(toastRegion()).findByRole('alert')).toHaveTextContent('Chưa rút lại được đồng ý. Thử lại sau.');
    expect(within(card).getByText('Đã đồng ý')).toBeInTheDocument();
  });

  it('after a withdrawal, or never accepted, leads to the notice', async () => {
    open({ consent: WITHDRAWN });
    const card = await section();
    await within(card).findByText('Bạn đã rút lại đồng ý ngày 03/11/2026. Cần đồng ý lại trước khi chấm công bằng điện thoại.');
  });

  it('never accepted: says so', async () => {
    open();
    const card = await section();
    await within(card).findByText('Bạn chưa đồng ý. Cần đồng ý trước lần chấm công bằng điện thoại đầu tiên.');
  });

  it('is only on the own profile', async () => {
    open({ consent: ACCEPTED }, HR, employeeId(7));
    await screen.findByRole('region', { name: 'Thông tin cá nhân' });
    expect(screen.queryByRole('region', { name: 'Chấm công bằng điện thoại' })).not.toBeInTheDocument();
  });
});
