import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays } from 'date-fns';
import type { Allocation, AllocationList } from '@/features/project/api';
import i18n from '@/i18n';
import { toIsoDate } from '@/lib/format';
import { allocationWriteApi } from '@/test/allocation-handlers';
import { HR, openMenuAndPick, openRowMenu, rowOf, serve } from '@/test/allocation-page';
import { DA031_CURRENT, projectDetail } from '@/test/project-fixtures';
import { toastRegion } from '@/test/render';

const running = (): Allocation => {
  const base = DA031_CURRENT.items[0]!;
  return { ...base, startDate: toIsoDate(addDays(new Date(), -20)), endDate: toIsoDate(addDays(new Date(), 200)), status: 'RUNNING' };
};
const live = (): { members: AllocationList; project: ReturnType<typeof projectDetail> } => ({
  members: { currentCount: 2, endedCount: 0, items: [running(), DA031_CURRENT.items[6]!] },
  project: projectDetail('DA-031', { startDate: toIsoDate(addDays(new Date(), -60)), endDate: toIsoDate(addDays(new Date(), 400)) }),
});

describe('End early and delete', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('ends a running allocation on a day before its end, and says so', async () => {
    const write = allocationWriteApi();
    serve({ ...live(), write });
    await openMenuAndPick('Vũ Thị Lan', 'Kết thúc sớm');
    const dialog = await screen.findByRole('dialog', { name: 'Kết thúc sớm phân bổ của Vũ Thị Lan?' });

    // A day at or after the planned end is refused on the field.
    const field = within(dialog).getByLabelText(/^Ngày làm cuối cùng/);
    fireEvent.change(field, { target: { value: toIsoDate(addDays(new Date(), 250)) } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kết thúc phân bổ' }));
    expect(await within(dialog).findByText(/^Chọn ngày trước /)).toBeInTheDocument();
    expect(write.writes).toEqual([]);

    const last = toIsoDate(addDays(new Date(), 10));
    fireEvent.change(field, { target: { value: last } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kết thúc phân bổ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write.writes).toEqual([{ method: 'END', id: running().id, body: { endDate: last } }]);
    expect(within(toastRegion()).getByText(/^Đã kết thúc phân bổ của Vũ Thị Lan, ngày cuối /)).toBeInTheDocument();
  });

  it('deletes an allocation that has not started, after asking', async () => {
    const write = allocationWriteApi();
    serve({ ...live(), write });
    await openMenuAndPick('Mạc Thị Quỳnh', 'Xóa phân bổ');
    const confirm = await screen.findByRole('dialog', { name: 'Xóa phân bổ của Mạc Thị Quỳnh?' });
    expect(confirm).toHaveTextContent('Không hoàn tác được.');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Hủy' }));
    expect(write.writes).toEqual([]);

    await openMenuAndPick('Mạc Thị Quỳnh', 'Xóa phân bổ');
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Xóa phân bổ của Mạc Thị Quỳnh?' })).getByRole('button', { name: 'Xóa phân bổ' }));
    await waitFor(() => expect(write.writes).toEqual([{ method: 'DELETE', id: DA031_CURRENT.items[6]!.id }]));
    expect(await within(toastRegion()).findByText('Đã xóa phân bổ của Mạc Thị Quỳnh')).toBeInTheDocument();
  });

  it('a started allocation cannot be deleted: the menu item is off and says to end it early', async () => {
    serve(live());
    const menu = await openRowMenu('Vũ Thị Lan');
    expect(within(menu).getByRole('menuitem', { name: 'Xóa phân bổ' })).toHaveAttribute('aria-disabled', 'true');
    expect(within(menu).getByRole('menuitem', { name: 'Kết thúc sớm' })).not.toHaveAttribute('aria-disabled');
    expect(menu).toHaveTextContent('Phân bổ đã bắt đầu nên không xóa được.');
  });

  it('one that has not started has no "Kết thúc sớm"', async () => {
    serve(live());
    const menu = await openRowMenu('Mạc Thị Quỳnh');
    expect(within(menu).queryByRole('menuitem', { name: 'Kết thúc sớm' })).not.toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Xóa phân bổ' })).not.toHaveAttribute('aria-disabled');
  });

  it('a delete the server refuses says why in a toast', async () => {
    serve({ ...live(), write: allocationWriteApi({ failWith: [409, 'allocation.started'] }) });
    await openMenuAndPick('Mạc Thị Quỳnh', 'Xóa phân bổ');
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xóa phân bổ' }));
    expect(await within(toastRegion()).findByText('Chưa xóa được phân bổ của Mạc Thị Quỳnh')).toBeInTheDocument();
    expect(within(toastRegion()).getByText('Phân bổ đã bắt đầu. Dùng “Kết thúc sớm” thay vì xóa.')).toBeInTheDocument();
  });
});

describe('Who can allocate', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('HR, who may only view the project, has neither the button nor the row menus', async () => {
    serve({ session: HR, project: projectDetail('DA-031', { canEdit: false }) });
    await rowOf('Cao Minh Trí');
    expect(screen.queryByRole('button', { name: 'Phân bổ nhân sự' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Thao tác với phân bổ/ })).not.toBeInTheDocument();
  });

  it('a closed project has neither the button nor the row menus, even for its PM', async () => {
    serve({ project: projectDetail('DA-031', { status: 'CLOSED' }) });
    await rowOf('Cao Minh Trí');
    expect(screen.queryByRole('button', { name: 'Phân bổ nhân sự' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Thao tác với phân bổ/ })).not.toBeInTheDocument();
  });
});
