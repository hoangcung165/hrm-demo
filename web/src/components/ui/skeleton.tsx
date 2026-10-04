// Library component "Skeleton": a bar or circle in `line` that pulses unless reduced motion is requested.
import { cn } from '@/lib/utils';

export type SkeletonProps = {
  shape?: 'bar' | 'title' | 'circle';
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
        className,
      )}
    />
  );
}
