import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MaskedValue, type MaskedValueProps } from './masked-value';

const LABELS = { showLabel: 'Hiện số CCCD', hideLabel: 'Ẩn số CCCD', showText: 'Hiện', hideText: 'Ẩn', emptyText: 'Chưa có' };

function Harness(props: Pick<MaskedValueProps, 'value' | 'revealable'>) {
  const [shown, setShown] = useState(false);
  return <MaskedValue {...LABELS} {...props} shown={shown} onToggle={() => setShown((value) => !value)} />;
}

describe('MaskedValue', () => {
  it('shows four dots and the last four digits, and toggles the full value in place', async () => {
    render(<Harness value="001194012847" revealable />);
    expect(screen.getByText('•••• 2847')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hiện số CCCD' }));
    expect(screen.getByText('001194012847')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ẩn số CCCD' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no toggle for a value the API masked, whatever its length, and says when there is none', () => {
    const { rerender } = render(<Harness value="••••••1275" revealable={false} />);
    expect(screen.getByText('•••• 1275')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<Harness value={null} revealable={false} />);
    expect(screen.getByText('Chưa có')).toBeInTheDocument();
  });
});
