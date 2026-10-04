// Form grid of the library component "Card": two equal columns from md up, one below.
// A field spans both columns with `className="md:col-span-2"`.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FormGridProps = { children: ReactNode; className?: string };

export function FormGrid({ children, className }: FormGridProps) {
  return <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)}>{children}</div>;
}
