// "Tạo đơn nghỉ": next to the title on the desktop; at 390 a bar pinned to the bottom of the screen.
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LeaveCreateLinkProps = { sticky?: boolean };

export function LeaveCreateLink({ sticky = false }: LeaveCreateLinkProps) {
  const { t } = useTranslation();
  const link = (
    <Link to="/leave/new" className={cn(buttonVariants(), sticky && 'h-11 w-full')}>
      <Plus aria-hidden="true" />
      {t('leave.create')}
    </Link>
  );
  if (!sticky) return link;
  return <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{link}</div>;
}
