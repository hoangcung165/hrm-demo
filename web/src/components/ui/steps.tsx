// Library component "Steps" (`hrm-steps`, pattern P5): where a wizard is. Not interactive: the wizard moves with its
// own buttons. Below 768 px (`compact`) it is one line, "Bước 2/3: Kiểm tra", and a progress bar.
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type StepsProps = {
  /** At most five. */
  steps: Array<{ label: string }>;
  /** The zero-based current step. */
  current: number;
  /** Every step is done (the result of the wizard). */
  complete?: boolean;
  compact?: boolean;
  className?: string;
};

export function Steps({ steps, current, complete = false, compact = false, className }: StepsProps) {
  const { t } = useTranslation();
  const at = Math.min(current, steps.length - 1);
  if (compact) {
    const done = complete ? steps.length : at;
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <p className="text-body-strong">{t('steps.compact', { index: at + 1, count: steps.length, label: steps[at]?.label })}</p>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label={t('steps.progress')} className="h-1 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${((complete ? steps.length : at + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <ol aria-label={t('steps.progress')} className={cn('flex items-center gap-3', className)}>
      {steps.map((step, index) => {
        const state = complete || index < at ? 'done' : index === at ? 'current' : 'upcoming';
        return (
          <li key={step.label} aria-current={state === 'current' ? 'step' : undefined} className={cn('flex items-center gap-3', index < steps.length - 1 && 'flex-1')}>
            <span
              aria-hidden="true"
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border text-caption tabular-nums [&_svg]:size-4 [&_svg]:stroke-2',
                state === 'upcoming' ? 'border-line bg-surface text-ink-muted' : 'border-transparent bg-brand-blue text-on-brand',
              )}
            >
              {state === 'done' ? <Check /> : index + 1}
            </span>
            <span className={cn('text-body-strong whitespace-nowrap', state === 'upcoming' ? 'text-ink-muted' : 'text-ink', state === 'current' && 'font-semibold')}>
              <span className="sr-only">{t(`steps.state.${state}`, { index: index + 1 })}</span>
              {step.label}
            </span>
            {index < steps.length - 1 ? <span aria-hidden="true" className={cn('h-px min-w-6 flex-1', state === 'done' ? 'bg-brand-blue' : 'bg-line')} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
