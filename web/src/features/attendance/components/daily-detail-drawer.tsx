// The drawer a day opens: the shift with its rules, what the day came to, and every raw punch (a phone punch with its
// place, photo and map link). Non-modal on a desktop;
// Esc closes it and focus goes back to the row. At 390 it is a full-screen sheet.
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { DetailList } from '@/components/ui/detail-list';
import { ErrorState } from '@/components/ui/error-state';
import { useCurrentAccount } from '@/features/auth/account-context';
import { companyTodayIso } from '@/lib/company-time';
import { Loading } from '@/components/ui/loading';
import { formatCompanyDateTime, formatCompanyTime, formatDate } from '@/lib/format';
import { useDailyDetail, type DailyDetail } from '../daily-api';
import { formatHours, marksOf } from '../daily-model';
import { dayLabel } from './daily-cells';
import { DailyMarks } from './daily-marks';
import { DailyPunchList } from './daily-punch-list';
import { shiftRules } from './daily-shift-rules';

export type DailyDetailDrawerProps = { target: { employeeId: string; date: string } | null; onClose: () => void };

function Body({ detail }: { detail: DailyDetail }) {
  const { t } = useTranslation();
  const { day, shift } = detail;
  const sources = [...new Map(detail.punches.filter((p) => p.source).map((p) => [p.source!.id, p.source!])).values()];
  const items = [
    { label: t('attendanceDaily.col.shift'), value: shift ? shiftRules(shift, t) : t('attendanceDaily.noShift') },
    { label: t('attendanceDaily.col.in'), value: day.in ? `${formatCompanyTime(day.in)} · ${formatDate(day.date)}` : '–' },
    { label: t('attendanceDaily.col.out'), value: day.out ? formatCompanyDateTime(day.out).replace(/ (\d)/, ' · $1') : '–' },
    { label: t('attendanceDaily.col.worked'), value: day.workedMinutes > 0 ? formatHours(day.workedMinutes) : '–' },
    { label: t('attendanceDaily.drawer.lateEarly'), value: day.lateMinutes + day.earlyLeaveMinutes > 0 ? [day.lateMinutes ? t('attendanceDaily.mark.late', { minutes: day.lateMinutes }) : '', day.earlyLeaveMinutes ? t('attendanceDaily.mark.early', { minutes: day.earlyLeaveMinutes }) : ''].filter(Boolean).join(', ') : t('attendanceDaily.drawer.no') },
    { label: t('attendanceDaily.col.marks'), value: <DailyMarks day={day} /> },
  ];
  const manual = detail.manualEntry;
  if (manual) {
    items.splice(1, 0, {
      label: t('attendanceDaily.drawer.manual'),
      value: (
        <span className="flex flex-col gap-0.5">
          <span>{manual.kind === 'TIMES' ? `${manual.in} – ${manual.out}` : t(`attendanceManual.kind.${manual.kind}`)}</span>
          {manual.note ? <span className="text-body-small">{manual.note}</span> : null}
          <span className="text-caption text-ink-muted">{t('attendanceDaily.drawer.manualBy', { by: manual.enteredBy ?? '–', at: formatCompanyDateTime(manual.enteredAt) })}</span>
        </span>
      ),
    });
  }
  return (
    <div className="flex flex-col gap-6">
      <DetailList items={items} />
      {detail.punches.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-strong">{t('attendanceDaily.drawer.punches', { count: detail.punches.length })}</h3>
          <DailyPunchList punches={detail.punches} day={day.date} />
          <p className="text-caption text-ink-muted">{t(manual ? 'attendanceDaily.drawer.explainManual' : 'attendanceDaily.drawer.explain')}</p>
          {detail.punches.some((punch) => punch.mobile) ? (
            // Photos and places are limited to the people in the caller's scope, and every view of a photo is recorded.
            <p className="text-caption text-ink-muted">{t('attendanceDaily.drawer.mobile.scope')}</p>
          ) : null}
          {day.flags.includes('OUTSIDE_LOCATION') || day.flags.includes('LOW_ACCURACY') ? (
            <p className="text-caption text-ink-muted">{t('attendanceDaily.drawer.mobile.review')}</p>
          ) : null}
        </section>
      ) : (
        <p className="text-body-small text-ink-muted">{t(marksOf(day).some((mark) => mark.key === 'noLog') ? 'attendanceDaily.drawer.noLog' : 'attendanceDaily.drawer.noPunches')}</p>
      )}
      {sources.map((source) => (
        <p key={source.id} className="text-caption text-ink-muted">
          {t('attendanceDaily.drawer.source', { file: source.fileName ?? t('attendanceImport.recent.noName'), at: formatCompanyDateTime(source.importedAt), by: source.importedBy ?? '–' })}
        </p>
      ))}
    </div>
  );
}

/** One's own day with a shift and a missing time (not Công thủ công, not after today) can take a Đơn bổ sung công. */
function canAdjust(detail: DailyDetail, me: string | null): boolean {
  const { day } = detail;
  return detail.employee.id === me && detail.shift !== null && !detail.manualEntry && (day.in === null || day.out === null) && day.date <= companyTodayIso();
}

export function DailyDetailDrawer({ target, onClose }: DailyDetailDrawerProps) {
  const { t } = useTranslation();
  const { employeeId } = useCurrentAccount();
  const query = useDailyDetail(target);
  const detail = query.data && target && query.data.day.date === target.date && query.data.employee.id === target.employeeId ? query.data : undefined;
  return (
    <Drawer
      open={target !== null}
      onClose={onClose}
      caption={t('attendanceDaily.drawer.caption')}
      title={target ? `${dayLabel(target.date, t)}/${target.date.slice(0, 4)}` : ''}
      subtitle={detail ? `${detail.employee.fullName} · ${[detail.employee.code, detail.employee.orgUnitName].filter(Boolean).join(' · ')}` : undefined}
      footer={
        detail ? (
          <>
            {canAdjust(detail, employeeId) ? (
              <Link to={`/attendance/adjustments/new?date=${detail.day.date}`} className={buttonVariants({ className: 'max-md:h-11' })}>
                {t('attendanceAdjustment.sendFromDay')}
              </Link>
            ) : null}
            <Link to={`/employees/${detail.employee.id}`} className={buttonVariants({ variant: 'secondary', className: 'max-md:h-11' })}>
              {t('attendanceDaily.drawer.profile')}
            </Link>
          </>
        ) : undefined
      }
    >
      {query.isError ? <ErrorState title={t('attendanceDaily.drawer.loadError')} onRetry={() => void query.refetch()} /> : detail ? <Body detail={detail} /> : <Loading rows={3} label={t('attendanceDaily.drawer.loading')} />}
    </Drawer>
  );
}
