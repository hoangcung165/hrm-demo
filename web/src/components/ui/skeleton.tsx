// Library component "Skeleton": a bar, circle or form-control block in `line` that pulses unless reduced motion is requested.
import { cn } from '@/lib/utils';

export type SkeletonProps = {
  /** `control` is the 40px block that stands for a form control, under a label bar. */
  shape?: 'bar' | 'title' | 'circle' | 'control';
  className?: string;
};

export function Skeleton({ shape = 'bar', className }: SkeletonProps) {
  return (
    <span
      className={cn(
        'block bg-line motion-safe:animate-pulse',
        shape === 'bar' && 'h-3 rounded-sm',
        shape === 'title' && 'h-4 rounded-sm',
        shape === 'circle' && 'size-8 shrink-0 rounded-full',
        shape === 'control' && 'h-10 rounded-sm',
        className,
      )}
    />
  );
}
