import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Person } from './person';
import { Tabs } from './tabs';

function Harness() {
  const [active, setActive] = useState<'tree' | 'chart'>('tree');
  return (
    <Tabs label="Cách xem" active={active} onChange={setActive} tabs={[{ id: 'tree', label: 'Cây đơn vị' }, { id: 'chart', label: 'Sơ đồ tổ chức', count: 2 }]}>
      <p>{active}</p>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('marks the active tab and names the panel after it', async () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Cách xem' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cây đơn vị' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Cây đơn vị' })).toHaveTextContent('tree');
    // In the tab order, so a panel without focusable content is reachable.
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
    await userEvent.click(screen.getByRole('tab', { name: /Sơ đồ tổ chức/ }));
    expect(screen.getByRole('tab', { name: /Sơ đồ tổ chức/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /Sơ đồ tổ chức/ })).toHaveTextContent('chart');
  });

  it('moves between tabs with the arrow keys', async () => {
    render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Cây đơn vị' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Sơ đồ tổ chức/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Sơ đồ tổ chức/ })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Cây đơn vị' })).toHaveFocus();
  });
});

describe('Person', () => {
  it('shows the name with its caption, and the vacant text without initials', () => {
    const { container } = render(
      <>
        <Person name="Đỗ Thành Trung" caption="NV-00012 · Giám đốc kỹ thuật" size="md" />
        <Person vacant name="Chưa có" />
      </>,
    );
    expect(screen.getByText('Đỗ Thành Trung')).toBeInTheDocument();
    expect(screen.getByText('ĐT')).toBeInTheDocument();
    expect(screen.getByText('NV-00012 · Giám đốc kỹ thuật')).toBeInTheDocument();
    expect(screen.getByText('Chưa có')).toBeInTheDocument();
    expect(screen.queryByText('CC')).not.toBeInTheDocument();
    expect(screen.getByText('NV-00012 · Giám đốc kỹ thuật')).toHaveClass('truncate');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('wraps the caption when asked, instead of cutting it', () => {
    render(<Person name="Đỗ Thành Trung" caption="NV-00012 · Giám đốc kỹ thuật" size="md" wrapCaption />);
    expect(screen.getByText('NV-00012 · Giám đốc kỹ thuật')).not.toHaveClass('truncate');
  });
});
