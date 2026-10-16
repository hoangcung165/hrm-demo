import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import i18n from '@/i18n';
import { server } from '@/test/server';
import type { EmploymentContract } from '../api';
import { ContractExportDialog } from './contract-export-dialog';

const contract: EmploymentContract = {
  id: 'contract-1', employeeId: 'employee-1', contractNumber: 'HD-TEST',
  contractType: 'FIXED_TERM', signedOn: '2026-01-01', startsOn: '2026-01-16',
  endsOn: null, baseSalary: 21_000_000, insuranceSalary: 18_000_000,
  allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE',
};
const employee = { id: 'employee-1', fullName: 'Nguyễn Văn An', code: 'NV00021' };

describe('HRM-10 FE-4 contract export', () => {
  beforeEach(async () => { await i18n.changeLanguage('vi'); });

  it('masks both money fields initially and reveals only when explicitly requested', async () => {
    render(<ContractExportDialog contract={contract} employee={employee} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Xuất hợp đồng HD-TEST' });
    expect(within(dialog).getAllByText('•••••• ₫')).toHaveLength(2);
    expect(within(dialog).queryByText('21000000')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Có trường chưa có giá trị')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hiện số tiền' }));
    expect(within(dialog).getByText('21000000')).toBeInTheDocument();
    expect(within(dialog).getByText('18000000')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ẩn số tiền' }));
    expect(within(dialog).getAllByText('•••••• ₫')).toHaveLength(2);
  });

  it('shows the actual missing-template error from the authenticated export API', async () => {
    server.use(http.get('*/api/employees/:employeeId/contracts/:id/export', () =>
      HttpResponse.json({ code: 'contract_template.not_found' }, { status: 409 })));
    render(<ContractExportDialog contract={contract} employee={employee} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'Xuất hợp đồng HD-TEST' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tải Word' }));
    expect(await within(dialog).findByText(/Chưa có mẫu DOCX đang dùng/)).toBeInTheDocument();
  });
});
