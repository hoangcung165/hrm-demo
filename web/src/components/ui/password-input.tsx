// Library component "Input", password variant: a trailing button shows or hides the value.
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, type InputProps } from './input';

export type PasswordInputProps = Omit<InputProps, 'type' | 'trailing'> & {
  /** Starts with the value shown: a temporary password the Admin types to hand over, not a secret of their own. */
  defaultVisible?: boolean;
};

export function PasswordInput({ defaultVisible = false, ...props }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(defaultVisible);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('form.hidePassword') : t('form.showPassword')}
          aria-pressed={visible}
          className="-mr-2 grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-surface-muted [&_svg]:size-4 [&_svg]:stroke-[1.5]"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      }
    />
  );
}
