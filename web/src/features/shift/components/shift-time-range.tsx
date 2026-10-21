// "22:00 – 06:00" with a "Qua nửa đêm" mark when the shift ends the next day (the mark is text, not colour or icon alone).
import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { Shift } from '../api';

export type ShiftTimeRangeProps = { shift: Pick<Shift, 'startTime' | 'endTime' | 'crossesMidnight'> };

export function ShiftTimeRange({ shift }: ShiftTimeRangeProps) {
  const { t } = useTranslation();
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-medium tabular-nums whitespace-nowrap">
        {shift.startTime} – {shift.endTime}
      </span>
      {shift.crossesMidnight ? (
        <Badge variant="info" className="whitespace-nowrap">
          <Moon aria-hidden="true" />
          {t('shifts.crossesMidnight')}
        </Badge>
      ) : null}
    </span>
  );
}
