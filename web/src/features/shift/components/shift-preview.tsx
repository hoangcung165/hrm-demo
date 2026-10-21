// Live preview in the shift form: the hours the times add up to, as the backend will work them out.
import { Moon } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { normalizeTime, shiftLength } from '../duration';
import { formatMinutes } from '../format-duration';
import type { ShiftValues } from '../schemas';

export function ShiftPreview() {
  const { t } = useTranslation();
  const { control } = useFormContext<ShiftValues>();
  const [startTime, endTime, breakStart, breakEnd] = useWatch({ control, name: ['startTime', 'endTime', 'breakStart', 'breakEnd'] });
  const length = shiftLength({ startTime: normalizeTime(startTime), endTime: normalizeTime(endTime), breakStart: normalizeTime(breakStart), breakEnd: normalizeTime(breakEnd) });
  return (
    <div role="status" aria-label={t('shifts.preview.label')} className="flex flex-col gap-1 rounded-md border border-line bg-surface-muted p-3 text-caption">
      {length ? (
        <>
          <span className="text-body-strong text-ink">{t('shifts.preview.scheduled', { duration: formatMinutes(length.scheduledMinutes, t) })}</span>
          <span className="text-ink-muted">{t('shifts.preview.night', { duration: formatMinutes(length.nightMinutes, t) })}</span>
          {length.crossesMidnight ? (
            <span className="flex items-center gap-1 text-ink-muted [&_svg]:size-4 [&_svg]:stroke-[1.5]">
              <Moon aria-hidden="true" />
              {t('shifts.preview.crosses')}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-ink-muted">{t('shifts.preview.incomplete')}</span>
      )}
    </div>
  );
}
