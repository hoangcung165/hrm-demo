import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Field } from './field';
import { Select, type SelectOption } from './select';

const TYPES: SelectOption[] = [
  { value: 'BRANCH', label: 'Chi nhánh' },
  { value: 'DEPARTMENT', label: 'Phòng ban' },
  { value: 'TEAM', label: 'Nhóm' },
];

function Example({ initial = '', onChange = () => {}, ...rest }: { initial?: string; onChange?: (value: string) => void; disabled?: boolean; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Field label="Loại" required helper="Chỉ là nhãn." error={rest.error}>
      {(control) => (
        <Select
          {...control}
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          options={TYPES}
          placeholder="Chọn loại"
          disabled={rest.disabled}
        />
      )}
    </Field>
  );
}

const control = () => screen.getByRole('combobox', { name: 'Loại' });

describe('Select', () => {
  it('is a combobox named by its label, shows the placeholder and is described by the helper', () => {
    render(<Example />);
    expect(control()).toHaveTextContent('Chọn loại');
    expect(control()).toHaveAttribute('aria-expanded', 'false');
    expect(control()).toHaveAttribute('aria-required', 'true');
    expect(control()).toHaveAccessibleDescription('Chỉ là nhãn.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens with the keyboard, moves with the arrows and picks with Enter', async () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    control().focus();
    await userEvent.keyboard('{Enter}');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Chi nhánh', 'Phòng ban', 'Nhóm']);
    // While the list is open the rest of the page, the control included, is hidden from assistive technology.
    expect(screen.getByRole('combobox', { hidden: true })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(options[0]).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    expect(options[1]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('DEPARTMENT');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(control()).toHaveTextContent('Phòng ban');
    expect(control()).toHaveFocus();
  });

  it('marks the selected option and closes on Escape without changing the value', async () => {
    const onChange = vi.fn();
    render(<Example initial="TEAM" onChange={onChange} />);
    await userEvent.click(control());
    expect(screen.getByRole('option', { name: 'Nhóm' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Chi nhánh' })).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{ArrowUp}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(control()).toHaveTextContent('Nhóm');
  });

  it('picks by typing the first letters, open or closed', async () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    control().focus();
    await userEvent.keyboard('n');
    expect(onChange).toHaveBeenLastCalledWith('TEAM');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('p');
    expect(screen.getByRole('option', { name: 'Phòng ban' })).toHaveFocus();
  });

  it('shows the error instead of the helper and marks the control invalid', () => {
    render(<Example error="Chọn loại đơn vị." />);
    expect(control()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Chọn loại đơn vị.');
    expect(control()).toHaveAccessibleDescription('Chọn loại đơn vị.');
    expect(screen.queryByText('Chỉ là nhãn.')).not.toBeInTheDocument();
  });

  it('does not open when disabled, and indents options by level', async () => {
    const { rerender } = render(<Example initial="TEAM" disabled />);
    expect(control()).toBeDisabled();
    await userEvent.click(control());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    rerender(
      <Select
        aria-describedby={undefined}
        value="a"
        onChange={() => {}}
        placeholder="Chọn đơn vị cha"
        options={[
          { value: 'root', label: 'Công ty', level: 0 },
          { value: 'a', label: 'Phòng Kinh doanh', level: 1 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Công ty' }).style.paddingLeft).toBe('');
    expect(screen.getByRole('option', { name: 'Phòng Kinh doanh' }).style.paddingLeft).toContain('1 * var(--space-4)');
  });
});
