import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays } from 'date-fns';
import i18n from '@/i18n';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import { HR, serve } from '@/test/allocation-page';
import { candidatesApi, DIEM_MY, JAVA, MINH_TUAN, REACT, skillCatalogOk, TYPESCRIPT, VAN_AN, VAN_THANH } from '@/test/candidate-handlers';
import { projectDetail } from '@/test/project-fixtures';
import { server } from '@/test/server';

const START = toIsoDate(addDays(companyToday(), -60));
const END = toIsoDate(addDays(companyToday(), 400));
const live = (overrides = {}) => projectDetail('DA-031', { startDate: START, endDate: END, ...overrides });

/** The project page of DA-031, with the candidates and the skill catalog; opens the drawer. */
async function openDrawer(candidates = candidatesApi(), setup: Parameters<typeof serve>[0] = {}, button = 'Tìm người', title = 'Tìm người') {
  serve({ project: live(), ...setup });
  server.use(skillCatalogOk(), candidates.handler);
  await userEvent.click(await screen.findByRole('button', { name: button }));
  return { candidates, drawer: await screen.findByRole('dialog', { name: title }) };
}

async function chooseSkill(drawer: HTMLElement, label: string, skill: string, level?: number) {
  await userEvent.click(within(drawer).getByRole('combobox', { name: label }));
  await userEvent.click(await screen.findByRole('option', { name: skill }));
  if (level) {
    await userEvent.click(within(drawer).getByRole('combobox', { name: `Mức tối thiểu của ${skill}` }));
    await userEvent.click(await screen.findByRole('option', { name: `Từ mức ${level}/5` }));
  }
}

describe('Tìm người drawer', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('opens with the range from today to the end of the project and asks for a skill before it searches', async () => {
    const { candidates, drawer } = await openDrawer();
    expect(within(drawer).getByRole('heading', { name: 'Tìm người' })).toBeInTheDocument();
    expect(drawer).toHaveTextContent('DA-031 · Ứng dụng đặt lịch khám');
    expect(within(drawer).getByLabelText(/^Từ ngày/)).toHaveValue(toIsoDate(companyToday()));
    expect(within(drawer).getByLabelText(/^Đến ngày/)).toHaveValue(END);
    expect(within(drawer).getByLabelText('Cần phân bổ')).toHaveValue('');
    expect(within(drawer).getByRole('combobox', { name: 'Kỹ năng 1' })).toHaveTextContent('Chọn kỹ năng');
    expect(within(drawer).getByRole('heading', { name: 'Chọn ít nhất một kỹ năng' })).toBeInTheDocument();
    expect(candidates.requests).toEqual([]);
  });

  it('is a wide drawer that does not block the page behind it', async () => {
    const { drawer } = await openDrawer();
    expect(drawer).toHaveAttribute('aria-modal', 'false');
    expect(drawer.className).toContain('md:w-[720px]');
    expect(screen.getByRole('button', { name: 'Tìm người' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('finds people as the skills are chosen, grouped by the skills met, in the order the API gives', async () => {
    const { candidates, drawer } = await openDrawer();
    await chooseSkill(drawer, 'Kỹ năng 1', 'React', 3);
    await waitFor(() => expect(candidates.requests).toHaveLength(1));
    expect(candidates.requests[0]!.get('skills')).toBe(`${REACT.id}:3`);
    expect(candidates.requests[0]!.get('from')).toBe(toIsoDate(companyToday()));
    expect(candidates.requests[0]!.get('to')).toBe(END);
    expect(candidates.requests[0]!.get('need')).toBeNull();

    await userEvent.click(await within(drawer).findByRole('button', { name: 'Thêm kỹ năng' }));
    await chooseSkill(drawer, 'Kỹ năng 2', 'TypeScript', 3);
    expect(await within(drawer).findByRole('heading', { name: '6 người phù hợp' })).toBeInTheDocument();
    expect(drawer).toHaveTextContent('Không gồm 7 thành viên của dự án và người đã nghỉ việc.');

    expect(await within(drawer).findByRole('heading', { name: /^Khớp đủ 2 kỹ năng/ })).toHaveTextContent('4');
    expect(within(drawer).getByRole('heading', { name: /^Khớp 1\/2 kỹ năng/ })).toHaveTextContent('2');
    const full = within(drawer).getByRole('list', { name: 'Người khớp đủ 2 kỹ năng' });
    expect(within(full).getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining('Phan Khánh Duy'),
      expect.stringContaining('La Văn Khải'),
      expect.stringContaining('Nguyễn Văn An'),
      expect.stringContaining('Đoàn Minh Tuấn'),
    ]);
    const part = within(drawer).getByRole('list', { name: 'Người khớp 1 trong 2 kỹ năng' });
    expect(within(part).getAllByRole('link')).toHaveLength(2);
  });

  it('shows each person with the free figure, the skills against the minimum, leave and the load of each month', async () => {
    const { drawer } = await openDrawer();
    await chooseSkill(drawer, 'Kỹ năng 1', 'React', 3);
    await userEvent.click(await within(drawer).findByRole('button', { name: 'Thêm kỹ năng' }));
    await chooseSkill(drawer, 'Kỹ năng 2', 'TypeScript', 3);
    await within(drawer).findByRole('heading', { name: /^Khớp đủ 2 kỹ năng/ });
    const row = (name: string) => within(drawer).getByRole('link', { name: new RegExp(name) }).closest('li')!;

    const duy = row('Phan Khánh Duy');
    expect(within(duy).getByText('Nhân viên · Nhóm Web Đà Nẵng')).toBeInTheDocument();
    expect(within(duy).getByText('70% còn trống')).toBeInTheDocument();
    expect(duy).toHaveTextContent('React');
    expect(duy).toHaveTextContent('Mức 4/5');
    expect(within(within(duy).getByRole('list', { name: 'Tải phân bổ theo tháng' })).getAllByRole('img')).toHaveLength(5);
    expect(within(duy).getByRole('img', { name: 'Tháng 11/2026: Tải phân bổ 30%' })).toBeInTheDocument();

    // Short of the need: "Thiếu" is said in words, with the leave dates of the range.
    const an = row('Nguyễn Văn An');
    expect(within(an).getByText('Nghỉ phép 24/12 – 26/12')).toBeInTheDocument();

    // Over 100% on some day: the free figure is 0% and the badge says so, never colour alone.
    const tuan = row('Đoàn Minh Tuấn');
    expect(within(tuan).getByText('Quá tải 110%')).toBeInTheDocument();
    expect(within(tuan).getByText('0% còn trống')).toBeInTheDocument();
    expect(within(tuan).getByRole('img', { name: 'Tháng 11/2026: Tải phân bổ 110%, quá tải' })).toBeInTheDocument();

    // A skill below the minimum names both levels; a missing one says so.
    expect(within(row(VAN_THANH.employee.fullName)).getByText('Mức 2/5, cần 3')).toBeInTheDocument();
    expect(within(row(DIEM_MY.employee.fullName)).getByText('Chưa có React')).toBeInTheDocument();
    expect(within(row(DIEM_MY.employee.fullName)).queryByRole('list', { name: 'Tải phân bổ theo tháng' })).not.toBeInTheDocument();
  });

  it('says how short a person is of the allocation needed, and sends it with the search', async () => {
    const { candidates, drawer } = await openDrawer();
    await chooseSkill(drawer, 'Kỹ năng 1', 'React', 3);
    await userEvent.type(within(drawer).getByLabelText('Cần phân bổ'), '50');
    await waitFor(() => expect(candidates.requests.at(-1)!.get('need')).toBe('50'));
    const an = (await within(drawer).findByRole('link', { name: new RegExp(VAN_AN.employee.fullName) })).closest('li')!;
    expect(within(an).getByText('Thiếu 30%')).toBeInTheDocument();
    const tuan = within(drawer).getByRole('link', { name: new RegExp(MINH_TUAN.employee.fullName) }).closest('li')!;
    expect(within(tuan).queryByText(/^Thiếu/)).not.toBeInTheDocument();
  });

  it('orders by free percent without group headings when asked to', async () => {
    const { candidates, drawer } = await openDrawer();
    await chooseSkill(drawer, 'Kỹ năng 1', 'React', 3);
    await userEvent.click(await within(drawer).findByRole('combobox', { name: 'Sắp xếp' }));
    await userEvent.click(await screen.findByRole('option', { name: '% trống, rồi khớp kỹ năng' }));
    await waitFor(() => expect(candidates.requests.at(-1)!.get('sort')).toBe('free'));
    const list = await within(drawer).findByRole('list', { name: 'Người phù hợp' });
    expect(within(list).getAllByRole('link')[0]).toHaveTextContent('Kiều Văn Thành');
    expect(within(drawer).queryByRole('heading', { name: /^Khớp/ })).not.toBeInTheDocument();
  });

  it('puts a message under a date outside the project and does not search', async () => {
    const { candidates, drawer } = await openDrawer();
    await chooseSkill(drawer, 'Kỹ năng 1', 'React', 3);
    await waitFor(() => expect(candidates.requests).toHaveLength(1));
    fireEvent.change(within(drawer).getByLabelText(/^Đến ngày/), { target: { value: toIsoDate(addDays(companyToday(), 500)) } });
    fireEvent.change(within(drawer).getByLabelText('Cần phân bổ'), { target: { value: '120' } });
    expect(await within(drawer).findByText(/^Dự án kết thúc \d\d\/\d\d\/\d{4}\. Chọn ngày đến hết \d\d\/\d\d\/\d{4}\.$/)).toBeInTheDocument();
    expect(within(drawer).getByText('Từ 1 đến 100%.')).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/^Đến ngày/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(drawer).getByText('Sửa các trường có lỗi để xem kết quả.')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(candidates.requests).toHaveLength(1);
  });

  it('says when nobody meets the criteria and offers to lower the hardest level', async () => {
    const { candidates, drawer } = await openDrawer(candidatesApi({ people: [] }));
    await chooseSkill(drawer, 'Kỹ năng 1', 'Java', 5);
    expect(await within(drawer).findByRole('heading', { name: 'Không ai đạt Java từ mức 5' })).toBeInTheDocument();
    expect(drawer).toHaveTextContent('Thành viên của dự án và người đã nghỉ việc không được tính.');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Hạ Java xuống mức 4' }));
    await waitFor(() => expect(candidates.requests.at(-1)!.get('skills')).toBe(`${JAVA.id}:4`));
    expect(within(drawer).getByRole('combobox', { name: 'Mức tối thiểu của Java' })).toHaveTextContent('Từ mức 4/5');
  });

  it('keeps the criteria when the results cannot be loaded, and tries again on request', async () => {
    const { candidates, drawer } = await openDrawer(candidatesApi({ fail: true }));
    await chooseSkill(drawer, 'Kỹ năng 1', 'TypeScript', 3);
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('Không tải được kết quả tìm người');
    expect(within(drawer).getByRole('combobox', { name: 'Kỹ năng 1' })).toHaveTextContent('TypeScript');
    const before = candidates.requests.length;
    await userEvent.click(within(drawer).getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(candidates.requests.length).toBe(before + 1));
  });

  it('puts the field error the API refused with under the field, not an error state', async () => {
    const { drawer } = await openDrawer(candidatesApi({ refuse: { field: 'to', code: 'outside_project' } }));
    await chooseSkill(drawer, 'Kỹ năng 1', 'React', 3);
    expect(await within(drawer).findByText('Khoảng ngày phải nằm trong thời gian dự án.')).toBeInTheDocument();
    expect(within(drawer).queryByText('Không tải được kết quả tìm người')).not.toBeInTheDocument();
  });

  it('takes a skill out of the other rows, and drops a row', async () => {
    const { drawer } = await openDrawer();
    await chooseSkill(drawer, 'Kỹ năng 1', 'React');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Thêm kỹ năng' }));
    await userEvent.click(within(drawer).getByRole('combobox', { name: 'Kỹ năng 2' }));
    expect(await screen.findByRole('option', { name: 'React' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Bỏ kỹ năng React' }));
    expect(within(drawer).getAllByRole('combobox', { name: /^Kỹ năng/ })).toHaveLength(1);
  });

  it('closes with Esc and gives focus back to the button', async () => {
    const { drawer } = await openDrawer();
    expect(drawer).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tìm người' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Tìm người' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Tìm người' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('is not offered to someone who cannot edit the project, or on a closed project', async () => {
    serve({ session: HR, project: live({ canEdit: false }) });
    await screen.findByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' });
    expect(screen.queryByRole('button', { name: 'Tìm người' })).not.toBeInTheDocument();
  });

  it('is not offered on a closed project', async () => {
    serve({ project: live({ status: 'CLOSED' }) });
    await screen.findByRole('heading', { level: 1, name: 'Ứng dụng đặt lịch khám' });
    expect(screen.queryByRole('button', { name: 'Tìm người' })).not.toBeInTheDocument();
  });

  it('speaks English', async () => {
    await i18n.changeLanguage('en');
    const { drawer } = await openDrawer(candidatesApi(), {}, 'Find people', 'Find people');
    expect(within(drawer).getByRole('heading', { name: 'Find people' })).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'Choose at least one skill' })).toBeInTheDocument();
  });
});
