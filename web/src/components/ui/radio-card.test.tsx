import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioCard } from './radio-card';

describe('RadioCard', () => {
  it('is a radio named by its title, with its caption, and moves with the arrow keys', async () => {
    const user = userEvent.setup();
    const chosen: string[] = [];
    render(
      <div role="radiogroup" aria-label="Loại nghỉ">
        <RadioCard name="type" value="pn" title="Phép năm" caption="Còn 4,5" onChange={() => chosen.push('pn')} />
        <RadioCard name="type" value="om" title="Nghỉ ốm" caption="Cần giấy y tế" onChange={() => chosen.push('om')} />
      </div>,
    );
    await user.click(screen.getByRole('radio', { name: /Phép năm/ }));
    expect(screen.getByText('Còn 4,5')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /Nghỉ ốm/ })).toBeChecked();
    expect(chosen).toEqual(['pn', 'om']);
  });
});
