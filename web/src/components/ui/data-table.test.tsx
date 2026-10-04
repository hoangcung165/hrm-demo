import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { formatMoney } from '@/lib/format';
import { DataTable, type DataTableColumn } from './data-table';

type Row = { code: string; name: string; salary: number };

const rows: Row[] = Array.from({ length: 45 }, (_, i) => ({
  code: `NV-${String(i + 1).padStart(4, '0')}`,
  name: `Nhân viên ${i + 1}`,
  salary: 10_000_000 + i * 500_000,
}));

const columns: Array<DataTableColumn<Row>> = [
  { id: 'code', header: 'Mã nhân viên', cell: (row) => row.code },
  { id: 'name', header: 'Họ và tên', cell: (row) => row.name },
  { id: 'salary', header: 'Lương cơ bản', numeric: true, cell: (row) => formatMoney(row.salary) },
];

describe('DataTable', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('renders a named table with sticky headers and right-aligned numeric columns', () => {
    render(<DataTable caption="Danh sách nhân viên" columns={columns} data={rows} rowKey={(row) => row.code} />);
    const table = screen.getByRole('table', { name: 'Danh sách nhân viên' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Mã nhân viên', 'Họ và tên', 'Lương cơ bản']);
    headers.forEach((header) => expect(header).toHaveClass('sticky', 'top-0'));
    expect(headers[2]).toHaveClass('text-right');
    expect(screen.getByRole('cell', { name: '10.000.000 ₫' })).toHaveClass('text-right', 'tabular-nums');
    expect(screen.getByRole('cell', { name: 'NV-0001' })).not.toHaveClass('text-right');
  });

  it('pages 20 rows at a time and says which rows are shown', async () => {
    render(<DataTable caption="Danh sách nhân viên" columns={columns} data={rows} rowKey={(row) => row.code} />);
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('1–20 trong 45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText('21–40 trong 45')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NV-0021' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'NV-0001' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Trang 3' }));
    expect(screen.getByText('41–45 trong 45')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Trang 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
  });

  it('hides pagination when everything fits on one page', () => {
    render(<DataTable caption="Danh sách nhân viên" columns={columns} data={rows.slice(0, 5)} rowKey={(row) => row.code} />);
    expect(screen.queryByRole('navigation', { name: 'Phân trang' })).not.toBeInTheDocument();
  });
});
