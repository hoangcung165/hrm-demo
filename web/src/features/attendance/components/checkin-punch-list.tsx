// Today's punches on the Chấm công hôm nay card, oldest first: the time, "Vào" or "Ra", where it was and, for a phone
// punch, whether it was inside its Địa điểm chấm công. A machine punch says it came from the punch machine.
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { formatCompanyTime, formatDistance } from '@/lib/format';
import type { CheckinPunch } from '../mobile-checkin-api';
import { punchLabel, punchWhere } from '../mobile-checkin-model';

export type CheckinPunchListProps = { punches: CheckinPunch[] };

function PunchRow({ punch, index }: { punch: CheckinPunch; index: number }) {
  const { t } = useTranslation();
  const time = formatCompanyTime(punch.at);
  const label = t(`mobileCheckin.card.punch.${punchLabel(index)}`);
  const where = punchWhere(punch);
  const place = where
    ? where.distanceMeters === null ? where.place : t('mobileCheckin.card.punch.at', { place: where.place, distance: formatDistance(where.distanceMeters) })
    : t('mobileCheckin.card.punch.machine');
  return (
    <li className="flex items-center gap-3 border-t border-line py-2 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span>
          <span className="font-semibold tabular-nums">{time}</span> <span>{label}</span>
        </span>
        <span className="text-caption text-ink-muted [overflow-wrap:anywhere]">{place}</span>
      </span>
      {where ? (
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={where.outside ? 'warning' : 'success'}>{t(where.outside ? 'mobileCheckin.mark.outside' : 'mobileCheckin.mark.inside')}</Badge>
          {punch.lowAccuracy ? <Badge variant="warning">{t('mobileCheckin.mark.lowAccuracy')}</Badge> : null}
        </span>
      ) : null}
    </li>
  );
}

export function CheckinPunchList({ punches }: CheckinPunchListProps) {
  const { t } = useTranslation();
  return (
    <ul aria-label={t('mobileCheckin.card.punches')} className="flex flex-col">
      {punches.map((punch, index) => (
        <PunchRow key={punch.id} punch={punch} index={index} />
      ))}
    </ul>
  );
}
