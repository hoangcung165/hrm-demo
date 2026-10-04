// Library component "Button" (HRM design system on Claude Design).
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted disabled:border-line [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
  {
    variants: {
      variant: {
        primary: 'bg-brand-blue text-on-brand hover:bg-brand-blue-deep',
        secondary: 'bg-surface text-ink border-line hover:bg-surface-muted',
        ghost: 'bg-transparent text-brand-blue hover:bg-brand-blue-soft',
        danger: 'bg-danger text-on-brand',
      },
      size: {
        md: 'h-10 px-4 rounded-md text-body',
        // 14px is the design system's size for `sm` buttons; there is no text token for it.
        sm: 'h-8 px-3 rounded-sm text-[14px]',
        icon: 'size-10 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
