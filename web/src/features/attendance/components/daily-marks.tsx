// The marks of one day as badges: each has an icon and text, so colour never carries it alone. "–" when the day is in order.
import { CalendarOff, Clock, Copy, LogOut, Palmtree, TriangleAlert, Database, Ban, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { DailyDay } from '../daily-api';
import { marksOf, type MarkIcon } from '../daily-model';

const ICONS: Record<MarkIcon, LucideIcon> = {
  clock: Clock,
  'log-out': LogOut,
  alert: TriangleAlert,
  copy: Copy,
  leave: Palmtree,
  holiday: CalendarOff,
  'no-shift': Ban,
  'no-log': Database,
};

export function DailyMarks({ day }: { day: DailyDay }) {
  const { t } = useTranslation();
  const marks = marksOf(day);
  if (marks.length === 0) {
    return (
      <span className="text-ink-muted" aria-label={t('attendanceDaily.mark.none')}>
        –
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {marks.map((mark) => {
        const Icon = ICONS[mark.icon];
        return (
          <Badge key={mark.key} variant={mark.tone}>
            <Icon aria-hidden="true" />
            {t(`attendanceDaily.mark.${mark.key}`, mark.values)}
          </Badge>
        );
      })}
    </span>
  );
}
