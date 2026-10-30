// Library component "Approval row": a request waiting for the viewer, with Duyệt and Từ chối on the row (HRM-20). It
// is a list item of an Approval list (`ul`), usually in the body of a Dashboard widget. A request that cannot be
// quick-approved shows "Mở để duyệt" instead; a decided one turns into its result for the consumer to remove.
import { CircleArrowRight, CircleCheck, CircleX, Check, LoaderCircle } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { Button, buttonVariants } from './button';

export type ApprovalRowResult = {
  kind: 'approved' | 'moved' | 'rejected';
  /** "Đã duyệt nghỉ phép của Trương Thị Ngọc Hân". */
  text: string;
  /** A caption under it ("Chuyển tới HR duyệt cấp 2", "Lý do đã gửi cho người gửi"). */
  detail?: string;
  /** The Badge: "Đã duyệt", "Chuyển cấp 2", "Đã từ chối". */
  badge: string;
};

export type ApprovalRowLabels = {
  approve: string;
  approving: string;
  reject: string;
  /** For a request that needs the approver's eyes: "Mở để duyệt". */
  open: string;
  approveAria: string;
  rejectAria: string;
  openAria: string;
};

export type ApprovalRowProps = {
  /** The sender's full name, for the Avatar. */
  sender: string;
  /** "Nghỉ phép · Trương Thị Ngọc Hân", the link to the request. */
  title: string;
  to: string;
  /** One line of what is asked. */
  what: string;
  /** "Nhóm Web · Cấp 2/2". */
  unitLevel: string;
  /** Badges after the unit and level: Tự duyệt soon, warnings. */
  badges?: ReactNode;
  /** The server marked the request as not quick-approvable: only "Mở để duyệt". */
  needsOpening?: boolean;
  /** The decision is on its way: both buttons wait. */
  busy?: boolean;
  /** Set once decided: the row shows this instead of the request. */
  result?: ApprovalRowResult;
  labels: ApprovalRowLabels;
  onApprove: () => void;
  onReject: () => void;
  approveRef?: Ref<HTMLButtonElement>;
  rejectRef?: Ref<HTMLButtonElement>;
  className?: string;
};

const RESULT_ICON = { approved: CircleCheck, moved: CircleArrowRight, rejected: CircleX } as const;
const RESULT_TONE = { approved: 'text-success', moved: 'text-brand-blue', rejected: 'text-danger' } as const;
const RESULT_BADGE = { approved: 'success', moved: 'info', rejected: 'danger' } as const;

export function ApprovalRow({ sender, title, to, what, unitLevel, badges, needsOpening = false, busy = false, result, labels, onApprove, onReject, approveRef, rejectRef, className }: ApprovalRowProps) {
  if (result) {
    const Icon = RESULT_ICON[result.kind];
    return (
      <li className={cn('-mx-4 flex items-center gap-3 border-b border-line bg-surface-muted px-4 py-3 last:border-b-0 md:-mx-6 md:px-6', className)}>
        <Icon aria-hidden="true" className={cn('size-5 shrink-0 stroke-[1.5]', RESULT_TONE[result.kind])} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{result.text}</span>
          {result.detail ? <span className="text-caption text-ink-muted">{result.detail}</span> : null}
        </span>
        <Badge variant={RESULT_BADGE[result.kind]}>{result.badge}</Badge>
      </li>
    );
  }
  return (
    <li className={cn('flex flex-col gap-3 border-b border-line py-3 last:border-b-0 md:flex-row md:items-center', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar name={sender} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link to={to} className="truncate rounded-sm font-medium text-ink no-underline hover:text-brand-blue hover:underline focus-visible:shadow-focus-ring">
            {title}
          </Link>
          <span className="truncate text-body-small text-ink-muted">{what}</span>
          <span className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
            {unitLevel}
            {badges}
          </span>
        </div>
      </div>
      <div className="flex gap-2 max-md:pl-11 max-md:[&>*]:h-11 max-md:[&>*]:flex-1 md:shrink-0">
        {needsOpening ? (
          <Link to={to} aria-label={labels.openAria} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            {labels.open}
          </Link>
        ) : (
          <>
            <Button ref={rejectRef} variant="secondary" size="sm" disabled={busy} aria-label={labels.rejectAria} className={busy ? undefined : 'text-danger'} onClick={onReject}>
              {labels.reject}
            </Button>
            <Button ref={approveRef} data-approve="" size="sm" disabled={busy} aria-label={labels.approveAria} onClick={onApprove}>
              {busy ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <Check aria-hidden="true" />}
              {busy ? labels.approving : labels.approve}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
