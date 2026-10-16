// "Gửi đơn" (and "Hủy" back to where the form was opened from). Off while the check runs or finds a problem; at 390
// pinned to the bottom of the screen.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LeaveSend } from '../use-leave-send';

export type LeaveSendBarProps = { send: LeaveSend; label: string; onSend: () => void; backTo: string; sticky: boolean };

export function LeaveSendBar({ send, label, onSend, backTo, sticky }: LeaveSendBarProps) {
  const { t } = useTranslation();
  // While nothing is filled in, the button stays on so a click can say what is missing.
  const blocked = send.sending || send.checking || send.problems.length > 0 || send.checkFailed;
  return (
    <div className={cn('flex gap-2', sticky ? 'sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-line bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]' : 'justify-end')}>
      {sticky ? null : (
        <Link to={backTo} className={buttonVariants({ variant: 'secondary' })}>
          {t('leave.form.cancel')}
        </Link>
      )}
      <Button className={cn(sticky && 'h-11 w-full')} disabled={blocked} aria-busy={send.sending || undefined} onClick={onSend}>
        {send.sending ? t('leave.form.sending') : label}
      </Button>
    </div>
  );
}
