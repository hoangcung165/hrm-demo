// Library component "Approval steps" (pattern P7): the levels a request goes through, as a vertical list. Markers:
// done (check on teal), current (clock on warning with a ring, `aria-current="step"`), stopped (a cross: returned,
// rejected or cancelled there) and pending (a hollow ring). The connector is teal once a step is done. Each step has
// a title, an optional Badge, captions (who, when) and an optional quote (the decision's comment).
import { Check, Clock, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ApprovalStepState = 'done' | 'current' | 'stopped' | 'pending';

export type ApprovalStepItem = {
  id: string;
  /** "Cấp 2 · HR". */
  title: string;
  state: ApprovalStepState;
  /** The step's status as a Badge with text. */
  badge?: ReactNode;
  /** Who and when; each entry is one caption line. */
  captions?: ReactNode[];
  /** The comment given with the decision, shown in quotes. */
  quote?: string | null;
};

export type ApprovalStepsProps = {
  /** Accessible name of the list: "Các bước duyệt". */
  label: string;
  steps: ApprovalStepItem[];
  className?: string;
};

const MARKER: Record<ApprovalStepState, string> = {
  done: 'bg-brand-teal-soft text-success',
  current: 'bg-warning-soft text-warning ring-2 ring-warning',
  stopped: 'border border-line bg-surface text-danger',
  pending: 'border-2 border-line bg-surface',
};

export function ApprovalSteps({ label, steps, className }: ApprovalStepsProps) {
  return (
    <ol aria-label={label} className={cn('flex flex-col', className)}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.id} aria-current={step.state === 'current' ? 'step' : undefined} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
            <span aria-hidden="true" className="flex flex-col items-center">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full [&_svg]:size-4 [&_svg]:stroke-[1.5]', MARKER[step.state])}>
                {step.state === 'done' ? <Check /> : step.state === 'current' ? <Clock /> : step.state === 'stopped' ? <X /> : null}
              </span>
              {last ? null : <span className={cn('min-h-4 w-0.5 flex-1', step.state === 'done' ? 'bg-brand-teal' : 'bg-line')} />}
            </span>
            <div className={cn('flex min-w-0 flex-col items-start gap-1', !last && 'pb-4')}>
              <span className={cn('font-medium', step.state === 'pending' && 'text-ink-muted')}>{step.title}</span>
              {step.badge}
              {step.captions?.map((caption, i) => (
                <span key={i} className="text-caption text-ink-muted">
                  {caption}
                </span>
              ))}
              {step.quote ? <span className="[overflow-wrap:anywhere]">“{step.quote}”</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
