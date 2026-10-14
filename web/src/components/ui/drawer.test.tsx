import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import i18n from '@/i18n';
import { Drawer } from './drawer';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Drawer open={open} onClose={() => { setOpen(false); onClose(); }} caption="Detail" title="Cao Minh Trí" subtitle="NV00031" footer={<a href="/x">Profile</a>}>
        <p>Body</p>
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('renders nothing while closed, then a non-modal dialog named by its title with the head, body and footer', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    const panel = screen.getByRole('dialog', { name: 'Cao Minh Trí' });
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(panel).toHaveFocus();
    expect(screen.getByText('Detail')).toBeInTheDocument();
    expect(screen.getByText('NV00031')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('closes on Esc and on the close button, and gives focus back to the opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open' });

    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('leaves Esc to a modal dialog that is open on top of it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <>
        <Drawer open onClose={onClose} title="Detail">
          <p>Body</p>
        </Drawer>
        <div role="dialog" data-state="open" aria-label="Other" />
      </>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
