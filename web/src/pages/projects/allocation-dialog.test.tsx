import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { DUY, OVERLOADED_CHECK, PHUOC, allocationWriteApi } from '@/test/allocation-handlers';
import { openMenuAndPick, serve } from '@/test/allocation-page';
import { DA031_CURRENT } from '@/test/project-fixtures';
import { toastRegion } from '@/test/render';

const setDate = (label: RegExp, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

const openAdd = async (options: Parameters<typeof serve>[0] = {}) => {
  const rendered = serve(options);
  await userEvent.click(await screen.findByRole('button', { name: 'Phân bổ nhân sự' }));
  return { ...rendered, dialog: await screen.findByRole('dialog', { name: 'Phân bổ nhân sự' }) };
};

/** Searches the picker for `name` and chooses the person. */
const pickEmployee = async (dialog: HTMLElement, search: string, option: RegExp) => {
  await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }), search);
  await userEvent.click(within(dialog).getByRole('combobox', { name: /^Nhân viên/ }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};
const pickRole = async (dialog: HTMLElement, name: string) => {
  await userEvent.click(within(dialog).getByRole('combobox', { name: /^Vai trò dự án/ }));
  await userEvent.click(await screen.findByRole('option', { name }));
};
const fillAllocation = async (dialog: HTMLElement, who: { search: string; option: RegExp }, percent = '60') => {
  await pickEmployee(dialog, who.search, who.option);
  await pickRole(dialog, 'Lập trình viên');
  await userEvent.type(within(dialog).getByRole('textbox', { name: /^Phần trăm thời gian/ }), percent);
  setDate(/^Từ ngày/, '2026-10-14');
  setDate(/^Đến ngày/, '2026-12-31');
};

describe('Allocate dialog', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('an overload names the person, the period and the overlapping project, shows the load per period, and still saves', async () => {
    const { write, dialog } = await openAdd();
    await fillAllocation(dialog, { search: 'phuoc', option: /^Đặng Hữu Phước/ });

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Đặng Hữu Phước sẽ quá tải 120% từ 14/10 đến 31/10/2026');
    expect(alert).toHaveTextContent('Trùng với Cổng khách hàng bảo hiểm (60%).');
    expect(alert).toHaveTextContent('Giảm còn 40% hoặc bắt đầu từ 01/11/2026.');
    expect(write.tries.at(-1)).toEqual({ allocationId: null, employeeId: PHUOC.id, percent: 60, startDate: '2026-10-14', endDate: '2026-12-31' });

    const rows = within(within(dialog).getByRole('region', { name: 'Tải phân bổ của Đặng Hữu Phước theo từng khoảng' })).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      '01/10 – 13/10/202660%DA-029 60%',
      '14/10 – 31/10/2026120%Quá tải: DA-029 60% + DA-031 60%',
      '01/11 – 31/12/202660%DA-031 60%',
    ]);
    expect(within(rows[1]!).getByRole('img', { name: 'Tải phân bổ 120%, quá tải' })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Vẫn lưu khi quá tải' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write.writes).toHaveLength(1);
    expect(write.writes[0]!.body).toMatchObject({ employeeId: PHUOC.id, percent: 60, startDate: '2026-10-14', endDate: '2026-12-31' });
    const toast = toastRegion();
    expect(within(toast).getByText('Đã lưu phân bổ của Đặng Hữu Phước, nhưng người này quá tải')).toBeInTheDocument();

    // "Sửa phân bổ" in the toast reopens the allocation, its person fixed.
    await userEvent.click(within(toast).getByRole('button', { name: 'Sửa phân bổ' }));
    const edit = await screen.findByRole('dialog', { name: 'Sửa phân bổ' });
    expect(within(edit).getByRole('combobox', { name: /^Nhân viên/ })).toBeDisabled();
    expect(within(edit).getByRole('textbox', { name: /^Phần trăm thời gian/ })).toHaveValue('60');
  });

  it('without an overload the alert is a success with the peak, and the button stays "Phân bổ"', async () => {
    const { write, dialog } = await openAdd();
    expect(within(dialog).getByText(/Chọn nhân viên, phần trăm và khoảng ngày/)).toBeInTheDocument();
    await fillAllocation(dialog, { search: 'duy', option: /^Phan Khánh Duy/ }, '50');
    expect(await within(dialog).findByText('Không ai bị quá tải. Tải phân bổ cao nhất của Phan Khánh Duy là 80%.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Vẫn lưu khi quá tải' })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Phân bổ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write.writes[0]!.body).toEqual({ employeeId: DUY.id, projectRoleId: expect.any(String), percent: 50, startDate: '2026-10-14', endDate: '2026-12-31' });
    expect(within(toastRegion()).getByText('Đã phân bổ Phan Khánh Duy vào dự án')).toBeInTheDocument();
  });

  it('shows a skeleton while the check runs, and checks again after each change', async () => {
    const { write, dialog } = await openAdd();
    await fillAllocation(dialog, { search: 'duy', option: /^Phan Khánh Duy/ }, '50');
    expect(await within(dialog).findByText(/Không ai bị quá tải/)).toBeInTheDocument();
    const calls = write.tries.length;
    await userEvent.clear(within(dialog).getByRole('textbox', { name: /^Phần trăm thời gian/ }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Phần trăm thời gian/ }), '70');
    expect(await within(dialog).findByRole('status', { name: 'Đang kiểm tra Tải phân bổ' })).toBeInTheDocument();
    await waitFor(() => expect(write.tries.at(-1)).toMatchObject({ percent: 70 }));
    expect(write.tries.length).toBeGreaterThan(calls);
    expect(await within(dialog).findByText(/Không ai bị quá tải/)).toBeInTheDocument();
  });

  it('lists people with their load today, and the ones already in the project cannot be chosen', async () => {
    const { dialog } = await openAdd();
    await userEvent.click(within(dialog).getByRole('searchbox', { name: 'Tìm theo tên hoặc mã nhân viên' }));
    await userEvent.click(within(dialog).getByRole('combobox', { name: /^Nhân viên/ }));
    expect(await screen.findByRole('option', { name: 'Đặng Hữu Phước · NV00071 · Tải hôm nay 60%' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Phan Khánh Duy · NV00072 · Tải hôm nay 30%' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vũ Thị Lan · NV00065 · Đã có trong dự án từ 01/09/2026' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('refuses dates outside the project on their field, and missing fields, without calling the server', async () => {
    const { write, dialog } = await openAdd();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Phân bổ' }));
    expect(await within(dialog).findByText('Chọn nhân viên.')).toBeInTheDocument();
    expect(within(dialog).getByText('Chọn vai trò dự án.')).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập số nguyên từ 1 đến 100.')).toBeInTheDocument();

    setDate(/^Từ ngày/, '2026-08-15');
    setDate(/^Đến ngày/, '2027-05-01');
    const range = 'Ngày phải nằm trong thời gian của dự án (01/09/2026 – 31/03/2027).';
    expect(await within(dialog).findAllByText(range)).toHaveLength(2);
    expect(write.writes).toEqual([]);
    expect(write.tries).toEqual([]);
  });

  it('a person already in the project on those days is refused on the person field', async () => {
    const { dialog } = await openAdd({ write: allocationWriteApi({ failWith: [409, 'allocation.already_in_project'] }) });
    await fillAllocation(dialog, { search: 'duy', option: /^Phan Khánh Duy/ }, '50');
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Phân bổ' }));
    expect(await within(dialog).findByText(/Người này đã có phân bổ trong dự án vào một số ngày/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Phân bổ nhân sự' })).toBeInTheDocument();
  });

  it('a save the server refuses keeps the dialog open with a toast', async () => {
    const { dialog } = await openAdd({ write: allocationWriteApi({ failWith: [500, 'error.unknown'] }) });
    await fillAllocation(dialog, { search: 'duy', option: /^Phan Khánh Duy/ }, '50');
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Phân bổ' }));
    expect(await within(toastRegion()).findByText('Chưa lưu được phân bổ')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Phân bổ nhân sự' })).toBeInTheDocument();
  });

  it('when the check fails the dialog says so and the allocation can still be saved', async () => {
    const { write, dialog } = await openAdd({ write: allocationWriteApi({ failCheck: true }) });
    await fillAllocation(dialog, { search: 'duy', option: /^Phan Khánh Duy/ }, '50');
    expect(await within(dialog).findByText('Chưa kiểm tra được Tải phân bổ')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Phân bổ' }));
    await waitFor(() => expect(write.writes).toHaveLength(1));
  });

  it('edits an allocation from its row menu: the person is fixed and the change is saved', async () => {
    const write = allocationWriteApi({ check: () => OVERLOADED_CHECK });
    serve({ write });
    await openMenuAndPick('Cao Minh Trí', 'Sửa phân bổ');
    const dialog = await screen.findByRole('dialog', { name: 'Sửa phân bổ' });
    expect(within(dialog).getByRole('combobox', { name: /^Nhân viên/ })).toHaveTextContent('Cao Minh Trí');
    expect(within(dialog).getByRole('combobox', { name: /^Nhân viên/ })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: /^Phần trăm thời gian/ })).toHaveValue('60');
    await waitFor(() => expect(write.tries.at(-1)).toMatchObject({ allocationId: DA031_CURRENT.items[1]!.id, percent: 60 }));
    await userEvent.clear(within(dialog).getByRole('textbox', { name: /^Phần trăm thời gian/ }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Phần trăm thời gian/ }), '40');
    await userEvent.click(await within(dialog).findByRole('button', { name: /^(Lưu thay đổi|Vẫn lưu khi quá tải)$/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(write.writes.at(-1)).toMatchObject({ method: 'PUT', id: DA031_CURRENT.items[1]!.id, body: { percent: 40, startDate: '2026-10-14', endDate: '2026-12-31' } });
    expect(write.writes.at(-1)!.body).not.toHaveProperty('employeeId');
  });
});
