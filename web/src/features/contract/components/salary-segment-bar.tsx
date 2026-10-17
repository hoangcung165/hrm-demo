import { useTranslation } from 'react-i18next';
import { formatDayMonth, formatMoney } from '@/lib/format';
import { salarySegmentKey, type PeriodPiece } from '../salary-period';

export function SalarySegmentBar({ pieces, revealedKey }: {
  pieces: PeriodPiece[];
  /** Matches the single salary card explicitly revealed by the viewer. */
  revealedKey: string | null;
}) {
  const { t } = useTranslation();
  const k = 'employees.profile.salaryProfile';
  return (
    <div className="flex flex-col gap-2">
      {/* Focusable, so the keyboard can scroll it sideways at 390. */}
      <div tabIndex={0} role="region" aria-label={t(`${k}.segmentScroll`)}
        className="overflow-x-auto rounded-md border border-line">
        <div role="list" aria-label={t(`${k}.segmentBar`)}
          className="flex min-h-20 min-w-[580px] divide-x divide-line">
          {pieces.map((piece) => {
            const revealed = piece.kind === 'salary' && revealedKey === salarySegmentKey(piece.segment);
            const value = piece.kind === 'gap' ? t(`${k}.notCovered`)
              : revealed ? formatMoney(piece.segment.baseSalary) : t('employees.profile.contracts.masked');
            return (
              <div role="listitem" key={`${piece.from}-${piece.to}`}
                style={{ flex: `${piece.days} 1 0px` }}
                className={piece.kind === 'gap'
                  ? 'flex min-w-0 flex-col justify-center gap-1 bg-surface-muted px-3 py-3 text-ink-muted'
                  : 'flex min-w-0 flex-col justify-center gap-1 bg-brand-blue-soft px-3 py-3'}>
                <span className="text-caption tabular-nums">
                  {formatDayMonth(piece.from)}–{formatDayMonth(piece.to)}
                </span>
                <strong className="text-caption font-medium tabular-nums">{value}</strong>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-caption text-ink-muted">{t(`${k}.segmentHelp`)}</p>
    </div>
  );
}
