// The link back above the title of a leave screen: "← Nghỉ phép".
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LeaveBackLinkProps = { to: string; label: string };

export function LeaveBackLink({ to, label }: LeaveBackLinkProps) {
  return (
    <Link to={to} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 self-start max-md:h-11')}>
      <ArrowLeft aria-hidden="true" className="!size-4" />
      {label}
    </Link>
  );
}
