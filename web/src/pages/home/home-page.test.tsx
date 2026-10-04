import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('renders Vietnamese labels and shared formats by default', () => {
    render(<HomePage />);
    expect(screen.getAllByRole('button', { name: 'Duyệt' })[0]).toBeEnabled();
    expect(screen.getByText('12.500.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('02/10/2026')).toBeInTheDocument();
  });

  it('switches labels to English and remembers the choice', async () => {
    render(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Ngôn ngữ' }));
    expect(await screen.findAllByRole('button', { name: 'Approve' })).toHaveLength(2);
    expect(localStorage.getItem('hrm.lang')).toBe('en');
  });
});
