import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import i18n from '@/i18n';
import { FormField } from './form-field';

const schema = z.object({
  email: z.email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});
type Values = z.infer<typeof schema>;

function SampleForm({ onValid }: { onValid: (values: Values) => void }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onValid)}>
        <FormField<Values> name="email" type="email" label="Email" required helper="Dùng để đăng nhập." />
        <FormField<Values> name="password" type="password" label="Mật khẩu" required />
        <button type="submit">Đăng nhập</button>
      </form>
    </FormProvider>
  );
}

describe('FormField', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('labels the control and links the helper text to it', () => {
    render(<SampleForm onValid={() => {}} />);
    const email = screen.getByRole('textbox', { name: /Email/ });
    expect(email).toHaveAccessibleDescription('Dùng để đăng nhập.');
    expect(email).toBeRequired();
    expect(email).not.toBeInvalid();
  });

  it('shows the translated zod error under the field and marks it invalid', async () => {
    const onValid = vi.fn();
    render(<SampleForm onValid={onValid} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'mai.tran@');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const email = await screen.findByRole('textbox', { name: /Email/ });
    expect(email).toBeInvalid();
    expect(email).toHaveAccessibleDescription('Nhập email đúng định dạng, ví dụ an.nguyen@congty.vn.');
    expect(screen.getByLabelText(/Mật khẩu/)).toHaveAccessibleDescription('Nhập thông tin này.');
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(onValid).not.toHaveBeenCalled();
  });

  it('submits valid values and lets the user reveal the password', async () => {
    const onValid = vi.fn();
    render(<SampleForm onValid={onValid} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Email/ }), 'mai.tran@congty.vn');
    const password = screen.getByLabelText(/Mật khẩu/);
    await userEvent.type(password, 'matkhau-2026');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(password).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onValid).toHaveBeenCalledWith({ email: 'mai.tran@congty.vn', password: 'matkhau-2026' }, expect.anything());
  });
});
