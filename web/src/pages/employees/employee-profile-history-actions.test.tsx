import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { catalogApi } from '@/test/catalog-handlers';
import { employeeId } from '@/test/employee-fixtures';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { orgUnitsOk } from '@/test/org-unit-handlers';
import { ADMIN_ACCOUNT, EMPLOYEE_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const history = `/api/employees/${id}/work-history`;
const evaluations = `/api/employees/${id}/probation-evaluations`;
const contracts = `/api/employees/${id}/contracts`;
const hire = { sourceId: null, kind: 'HIRE', decisionNumber: null, signedOn: null,
  effectiveOn: '2018-08-01', description: 'Hired', previousOrgUnitId: null, orgUnitId: null,
  previousPositionId: null, positionId: null, actorId: null };
const source = { id: 'f32e4555-a43e-41a7-81f5-8860ab1ea515', employeeId: id,
  contractNumber: 'HD-TRIAL-01', contractType: 'PROBATION', signedOn: '2026-01-01',
  startsOn: '2026-01-02', endsOn: '2026-02-28', baseSalary: 9000000,
  insuranceSalary: null, allowancesJson: '[]', insured: false, taxMethod: 'WITHHOLD_10' };
function open(account = ADMIN_ACCOUNT) {
  server.use(employeeProfileApi().handler, ...catalogApi().handlers, orgUnitsOk(), http.get(history, () => HttpResponse.json([hire])),
    http.get(contracts, () => HttpResponse.json([source])),
    http.get(evaluations, () => HttpResponse.json([])));
  return renderRoutes(routes, { session: account, path: `/employees/${id}?tab=history` });
}

describe('Work-history actions', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('validates a decision then posts its source document and salary effect', async () => {
    let received: Record<string, unknown> | null = null;
    open();
    server.use(http.post(history, async ({ request }) => {
      received = await request.json() as Record<string, unknown>;
      return HttpResponse.json({ ...hire, ...received, sourceId: 'decision-1' }, { status: 201 });
    }));
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm quyết định' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm quyết định công tác' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu quyết định' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Kiểm tra số quyết định');
    await userEvent.type(within(dialog).getByLabelText(/Số quyết định/), 'QD-TEST-01');
    await userEvent.type(within(dialog).getByLabelText(/Nội dung quyết định/), 'Khen thưởng');
    fireEvent.change(within(dialog).getByLabelText(/Ngày ký/), { target: { value: '2026-09-01' } });
    fireEvent.change(within(dialog).getByLabelText(/Ngày hiệu lực/), { target: { value: '2026-09-02' } });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Quyết định thay đổi lương/phụ cấp' }));
    await userEvent.type(within(dialog).getByLabelText('Lương cơ bản mới (VND)'), '15000000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu quyết định' }));
    expect(await screen.findByText('Đã lưu quyết định công tác')).toBeInTheDocument();
    expect(received).toMatchObject({ kind: 'REWARD', decisionNumber: 'QD-TEST-01',
      effectiveOn: '2026-09-02', baseSalary: 15000000, insuranceSalary: null });
  });

  it('PASS uses a source contract and shows an editable formal-contract suggestion', async () => {
    let received: Record<string, unknown> | null = null;
    let saved: Record<string, unknown> | null = null;
    open();
    server.use(http.get(evaluations, () => HttpResponse.json(saved ? [saved] : [])));
    server.use(http.post(evaluations, async ({ request }) => {
      received = await request.json() as Record<string, unknown>;
      saved = { id: 'evaluation-1', ...received, actorId: ADMIN_ACCOUNT.id,
        formalContractSuggestion: { sourceContractId: source.id, contractType: 'INDEFINITE',
          startsOn: '2026-03-01', endsOn: null, baseSalary: 12000000, insuranceSalary: 12000000,
          allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE' } };
      return HttpResponse.json(saved, { status: 201 });
    }));
    await userEvent.click(await screen.findByRole('button', { name: 'Đánh giá thử việc' }));
    const dialog = screen.getByRole('dialog', { name: 'Đánh giá thử việc' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Hợp đồng nguồn' }));
    await userEvent.click(screen.getByRole('option', { name: 'HD-TRIAL-01' }));
    // The fixture's manager is preselected as evaluator.
    expect(within(dialog).getByLabelText(/Từ ngày/)).toHaveValue('2026-01-02');
    expect(within(dialog).getByLabelText(/Đến ngày/)).toHaveValue('2026-02-28');
    await userEvent.type(within(dialog).getByLabelText(/Nhận xét/), 'Đạt yêu cầu');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu đánh giá' }));
    expect(received).toMatchObject({ sourceContractId: source.id, outcome: 'PASS' });
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo hợp đồng chính thức' }));
    const formal = screen.getByRole('dialog', { name: 'Thêm hợp đồng lao động' });
    expect(within(formal).getByLabelText(/Ngày bắt đầu/)).toHaveValue('2026-03-01');
    expect(within(formal).getByLabelText(/Lương theo hợp đồng \(VND\)/)).toHaveValue('12000000');
  });

  it('requires explicit confirmation of the last working day', async () => {
    let calls = 0;
    open();
    server.use(http.post(`/api/employees/${id}/resignation`, () => { calls += 1; return HttpResponse.json(hire, { status: 201 }); }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ghi nhận nghỉ việc' }));
    const dialog = screen.getByRole('dialog', { name: 'Ghi nhận nghỉ việc' });
    fireEvent.change(within(dialog).getByLabelText(/Ngày làm việc cuối cùng/), { target: { value: '2026-09-20' } });
    await userEvent.type(within(dialog).getByLabelText(/Lý do nghỉ việc/), 'Nguyện vọng cá nhân');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    expect(calls).toBe(0);
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Tôi xác nhận ngày làm việc cuối cùng/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận nghỉ việc' }));
    expect(await screen.findByText('Đã ghi nhận nghỉ việc')).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('offers no action for a self-only account', async () => {
    open({ ...EMPLOYEE_ACCOUNT, employeeId: id });
    await screen.findByRole('tab', { name: 'Quá trình công tác' });
    expect(screen.queryByRole('button', { name: 'Thêm quyết định' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh giá thử việc' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ghi nhận nghỉ việc' })).not.toBeInTheDocument();
  });
});
