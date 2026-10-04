// Library component "Avatar": round, initials in brand-blue on brand-blue-soft when there is no photo.
import { cva, type VariantProps } from 'class-variance-authority';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-blue-soft font-semibold text-brand-blue',
  {
    variants: { size: { sm: 'size-6 text-[10px]', md: 'size-8 text-[12px]', lg: 'size-12 text-[16px]' } },
    defaultVariants: { size: 'md' },
  },
);

export type AvatarProps = VariantProps<typeof avatarVariants> & {
  /** Full name; the initials of its first and last word are shown. */
  name: string;
  src?: string;
  /** Nobody assigned: dashed circle with a person icon; always followed by text ("Chưa có"). */
  vacant?: boolean;
  className?: string;
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0]![0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size, vacant = false, className }: AvatarProps) {
  if (vacant) {
    return (
      <span
        aria-hidden="true"
        className={cn(avatarVariants({ size }), 'border border-dashed border-ink-muted bg-surface text-ink-muted', className)}
      >
        <User className={cn('stroke-[1.5]', size === 'sm' ? 'size-3.5' : 'size-4')} />
      </span>
    );
  }
  return (
    <span className={cn(avatarVariants({ size }), className)} aria-hidden="true">
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
