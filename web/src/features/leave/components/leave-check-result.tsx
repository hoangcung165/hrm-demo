// What the check says about the request on screen (artboards `#18 Tạo đơn nghỉ` and `vượt số dư`): the Day breakdown
// list with the total, then the problems that stop it, or the balance after it (a warning when it takes advance).
// The problems of a single field (the file, the dates' order) are shown at that field instead.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DayBreakdown } from '@/components/ui/day-breakdown';
import { dayRows } from '../day-rows';
import { formatDays } from '../leave-format';
import { problemText } from '../problem-text';
import type { LeaveSend } from '../use-leave-send';

/** Said at their field, not in the list of alerts. */
export const FIELD_PROBLEMS = ['leave.attachment_required', 'leave.invalid_dates'];

export type LeaveCheckResultProps = { send: LeaveSend; typeName: string; ready: boolean };

export function LeaveCheckResult({ send, typeName, ready }: LeaveCheckResultProps) {
  const { t } = useTranslation();
  if (!ready) return <p className="rounded-md border border-dashed border-line p-4 text-body-small text-ink-muted">{t('leave.form.checkHint')}</p>;
  if (send.checkFailed) {
    return (
      <Alert variant="danger" title={t('leave.form.checkError')}>
        <span className="flex flex-wrap items-center gap-3">
          {t('state.errorHint')}
          <Button variant="secondary" size="sm" onClick={send.retryCheck}>
            {t('state.retry')}
          </Button>
        </span>
      </Alert>
    );
  }
  const result = send.result;
  const over = send.has('leave.over_balance');
  const shown = send.problems.filter((problem) => !FIELD_PROBLEMS.includes(problem.code));
  const balance = result?.balance;
  const after = result?.remainingAfter ?? null;
  const values = { type: typeName, after: formatDays(after ?? 0), remaining: formatDays(balance?.remaining ?? 0), total: formatDays(result?.total ?? 0), pending: formatDays(balance?.pending ?? 0) };
  const advanceUsed = after !== null && after < 0 ? Math.min(-after, result?.total ?? 0) : 0;
  return (
    <div className="flex flex-col gap-3">
      <DayBreakdown
        title={t('leave.form.daysTitle')}
        total={result ? t('leave.days', { value: formatDays(result.total) }) : '…'}
        invalid={over}
        busy={send.checking}
        rows={result ? dayRows(t, result.days) : []}
      />
      {shown.map((problem, index) => {
        const text = problemText(t, problem, typeName);
        return (
          // A request across New Year can be over the balance of both years.
          <Alert key={`${problem.code}-${index}`} variant="danger" title={text.title}>
            {text.text}
          </Alert>
        );
      })}
      {result && send.problems.length === 0 && after !== null ? (
        advanceUsed > 0 ? (
          <Alert variant="warning" title={t('leave.form.advanceTitle', { days: formatDays(advanceUsed) })}>
            {t('leave.form.advanceText', values)}
          </Alert>
        ) : (
          <Alert variant="info" title={t(balance && balance.pending > 0 ? 'leave.form.afterWithPending' : 'leave.form.after', values)} />
        )
      ) : null}
    </div>
  );
}
