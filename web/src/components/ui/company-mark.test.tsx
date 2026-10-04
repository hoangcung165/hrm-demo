import { render, screen } from '@testing-library/react';
import { CompanyMark } from './company-mark';

const NAME = 'Công ty Cổ phần Công nghệ Mẫu';

describe('CompanyMark', () => {
  it('shows the logo as decoration next to the name, with the full name as tooltip', () => {
    render(<CompanyMark name={NAME} logoUrl="/api/company/logo?v=1" />);
    expect(screen.getByText(NAME)).toBeInTheDocument();
    expect(screen.getByTitle(NAME)).toBeInTheDocument();
    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/api/company/logo?v=1');
  });

  it('falls back to the building tile when there is no logo', () => {
    render(<CompanyMark name={NAME} logoUrl={null} />);
    expect(screen.getByText(NAME)).toBeInTheDocument();
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('names the tile after the company when the name is hidden', () => {
    const { rerender } = render(<CompanyMark name={NAME} logoUrl="/logo.png" showName={false} />);
    expect(screen.getByRole('img', { name: NAME })).toHaveAttribute('src', '/logo.png');
    expect(screen.queryByText(NAME)).not.toBeInTheDocument();
    rerender(<CompanyMark name={NAME} showName={false} />);
    expect(screen.getByRole('img', { name: NAME })).not.toHaveAttribute('src');
  });

  it('is busy while loading and shows the tile alone when the company is unknown', () => {
    const { rerender, container } = render(<CompanyMark loading loadingLabel="Đang tải" />);
    expect(screen.getByRole('status', { name: 'Đang tải' })).toHaveAttribute('aria-busy', 'true');
    rerender(<CompanyMark />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('');
  });
});
