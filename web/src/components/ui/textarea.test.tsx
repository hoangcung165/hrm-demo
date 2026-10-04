import { render, screen } from '@testing-library/react';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('valid: brand border on focus; invalid: the danger border stays, both with the focus ring', () => {
    const { rerender } = render(<Textarea aria-label="Địa chỉ" />);
    const frame = () => screen.getByRole('textbox', { name: 'Địa chỉ' }).parentElement!;
    expect(frame()).toHaveClass('focus-within:border-brand-blue', 'focus-within:shadow-focus-ring');
    rerender(<Textarea aria-label="Địa chỉ" invalid />);
    expect(screen.getByRole('textbox', { name: 'Địa chỉ' })).toBeInvalid();
    expect(frame()).toHaveClass('border-danger', 'focus-within:shadow-focus-ring');
    expect(frame()).not.toHaveClass('focus-within:border-brand-blue');
  });
});
