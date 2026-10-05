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

  describe('server paging', () => {
    const page = (index: number) => rows.slice(index * 20, index * 20 + 20);

    it('shows the page it is given and asks for another one instead of paging itself', async () => {
      const onPageChange = vi.fn();
      const { rerender } = render(<DataTable caption="Danh sách nhân viên" columns={columns} data={page(0)} rowKey={(row) => row.code} pageIndex={0} total={45} onPageChange={onPageChange} />);
      expect(screen.getAllByRole('row')).toHaveLength(21);
      expect(screen.getByText('1–20 trong 45')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
      expect(onPageChange).toHaveBeenCalledWith(1);
      // Nothing moves until the consumer passes the next page.
      expect(screen.getByRole('cell', { name: 'NV-0001' })).toBeInTheDocument();

      rerender(<DataTable caption="Danh sách nhân viên" columns={columns} data={page(2)} rowKey={(row) => row.code} pageIndex={2} total={45} onPageChange={onPageChange} />);
      expect(screen.getAllByRole('row')).toHaveLength(6);
      expect(screen.getByRole('cell', { name: 'NV-0041' })).toBeInTheDocument();
      expect(screen.getByText('41–45 trong 45')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Trang 3' })).toHaveAttribute('aria-current', 'page');
      await userEvent.click(screen.getByRole('button', { name: 'Trang 1' }));
      expect(onPageChange).toHaveBeenLastCalledWith(0);
    });

    it('states how much is shown even on a single page, with the record type when given', () => {
      render(
        <DataTable
          caption="Danh sách nhân viên"
          columns={columns}
          data={rows.slice(0, 5)}
          rowKey={(row) => row.code}
          pageIndex={0}
          total={5}
          onPageChange={() => {}}
          summary={({ from, to, total }) => `Hiển thị ${from}–${to} trên ${total} nhân viên`}
        />,
      );
      expect(within(screen.getByRole('navigation', { name: 'Phân trang' })).getByText('Hiển thị 1–5 trên 5 nhân viên')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    });
  });

  it('keeps the header and shows busy skeleton rows while loading', () => {
    render(<DataTable caption="Danh sách nhân viên" columns={columns} data={[]} rowKey={(row) => row.code} loading loadingLabel="Đang tải danh sách nhân viên" loadingRows={4} />);
    expect(screen.getByRole('status', { name: 'Đang tải danh sách nhân viên' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.queryByRole('navigation', { name: 'Phân trang' })).not.toBeInTheDocument();
  });

  describe('compact rows', () => {
    const layout = { lead: (row: Row) => row.name, meta: (row: Row) => row.code, end: (row: Row) => formatMoney(row.salary) };

    it('lists the same records in two lines, with previous and next only', async () => {
      render(<DataTable caption="Danh sách nhân viên" columns={columns} data={rows} rowKey={(row) => row.code} variant="compact" rows={layout} />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      const items = within(screen.getByRole('list', { name: 'Danh sách nhân viên' })).getAllByRole('listitem');
      expect(items).toHaveLength(20);
      expect(items[0]).toHaveTextContent('Nhân viên 1NV-000110.000.000 ₫');
      const pager = screen.getByRole('navigation', { name: 'Phân trang' });
      expect(within(pager).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Trang trước', 'Trang sau']);
      await userEvent.click(within(pager).getByRole('button', { name: 'Trang sau' }));
      expect(within(pager).getByText('21–40 trong 45')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Nhân viên 21');
    });

    it('names line two for screen readers when given labels, without showing them', () => {
      render(<DataTable caption="Danh sách nhân viên" columns={columns} data={rows.slice(0, 1)} rowKey={(row) => row.code} variant="compact" rows={{ ...layout, metaLabel: 'Mã nhân viên', endLabel: 'Lương cơ bản' }} />);
      const item = screen.getByRole('listitem');
      expect(item).toHaveTextContent('Nhân viên 1Mã nhân viên: NV-0001Lương cơ bản: 10.000.000 ₫');
      expect(within(item).getByText('Mã nhân viên:')).toHaveClass('sr-only');
      expect(within(item).getByText('Lương cơ bản:')).toHaveClass('sr-only');
    });

    it('puts the row action on line one and shows busy rows while loading', () => {
      const { rerender } = render(
        <DataTable caption="Danh sách nhân viên" columns={columns} data={rows.slice(0, 2)} rowKey={(row) => row.code} variant="compact" rows={{ ...layout, action: (row) => <button type="button">Thao tác cho {row.name}</button> }} />,
      );
      expect(within(screen.getAllByRole('listitem')[1]!).getByRole('button', { name: 'Thao tác cho Nhân viên 2' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('Nhân viên 2NV-000210.500.000 ₫');
      rerender(<DataTable caption="Danh sách nhân viên" columns={columns} data={[]} rowKey={(row) => row.code} variant="compact" rows={layout} loading loadingLabel="Đang tải danh sách nhân viên" />);
      expect(screen.getByRole('status', { name: 'Đang tải danh sách nhân viên' })).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
