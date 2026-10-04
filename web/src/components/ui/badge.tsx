// Library component "Badge" (HRM design system on Claude Design). Status is always text, never colour alone.
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 h-6 px-2 rounded-sm text-caption [&_svg]:size-4 [&_svg]:stroke-[1.5]',
  {
    variants: {
      variant: {
        success: 'text-success bg-brand-teal-soft',
        warning: 'text-warning bg-warning-soft',
        danger: 'text-danger bg-surface border border-line',
        info: 'text-brand-blue bg-info',
        neutral: 'text-ink-muted bg-surface-muted border border-line',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
