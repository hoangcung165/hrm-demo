import { render, screen, within } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { MemoryRouter, Link } from 'react-router';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { DashboardIconMark } from './dashboard-icon-mark';
import { DashboardList } from './dashboard-list';
import { DashboardListRow } from './dashboard-list-row';

const show = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('DashboardListRow', () => {
  it('a person row: the name as a link, the unit under it, the value with its sub line at the end', () => {
    show(
      <DashboardList label="Nghỉ hôm nay">
        <DashboardListRow lead={<Avatar name="Hồ Sỹ Quang" />} title={<Link to="/employees/1">Hồ Sỹ Quang</Link>} sub="Chi nhánh Đà Nẵng" end="Phép năm" endSub="cả ngày, đến 16/10" />
      </DashboardList>,
    );
    const row = within(screen.getByRole('list', { name: 'Nghỉ hôm nay' })).getByRole('listitem');
    expect(within(row).getByRole('link', { name: 'Hồ Sỹ Quang' })).toHaveAttribute('href', '/employees/1');
    expect(row).toHaveTextContent('Chi nhánh Đà Nẵng');
    expect(row).toHaveTextContent('Phép nămcả ngày, đến 16/10');
  });

  it('a thing row: a decorative icon mark and a Badge at the end', () => {
    const { container } = show(
      <DashboardList label="Sắp hết hạn">
        <DashboardListRow lead={<DashboardIconMark><FileText /></DashboardIconMark>} title="Nguyễn Văn An" end={<Badge variant="warning">Còn 47 ngày</Badge>} />
      </DashboardList>,
    );
    expect(container.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(screen.getByText('Còn 47 ngày')).toBeInTheDocument();
  });
});
