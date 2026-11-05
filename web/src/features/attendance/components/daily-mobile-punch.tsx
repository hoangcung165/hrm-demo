// What a reviewer sees of one mobile Lần quẹt in the day drawer (HRM-39, artboard `#39 Chi tiết ngày công: lần quẹt
// điện thoại`): the Địa điểm chấm công found then and how far, the accuracy the phone reported, Trong vùng / Ngoài vùng
// and Sai số lớn in words, a map link and the photo. Review is read-only: a wrong punch is corrected with an Đơn bổ sung công.
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { formatDistance } from '@/lib/format';
import type { MobilePunch, PunchLine } from '../daily-api';
import { mapUrl } from '../daily-model';
import { CheckinPhotoThumb } from './checkin-photo-thumb';

export type DailyMobilePunchProps = { punch: PunchLine; mobile: MobilePunch };

function where(mobile: MobilePunch, t: (key: string, values?: Record<string, string>) => string): string {
  const { location, distanceMeters } = mobile;
  if (!location) return t('attendanceDaily.drawer.mobile.noPlace');
  const name = location.active ? location.name : t('attendanceDaily.drawer.mobile.inactive', { place: location.name });
  return distanceMeters === null ? name : t('attendanceDaily.drawer.mobile.at', { place: name, distance: formatDistance(distanceMeters) });
}

export function DailyMobilePunch({ punch, mobile }: DailyMobilePunchProps) {
  const { t } = useTranslation();
  return (
    <div className="col-span-4 flex items-start gap-3 pb-1">
      <CheckinPhotoThumb punch={punch} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-small [overflow-wrap:anywhere]">{where(mobile, t)}</span>
        <span className="text-caption text-ink-muted">{t('attendanceDaily.drawer.mobile.accuracy', { accuracy: formatDistance(mobile.accuracyMeters) })}</span>
        <span className="flex flex-wrap gap-1">
          <Badge variant={mobile.outsideLocation ? 'warning' : 'success'}>{t(mobile.outsideLocation ? 'mobileCheckin.mark.outside' : 'mobileCheckin.mark.inside')}</Badge>
          {mobile.lowAccuracy ? <Badge variant="warning">{t('mobileCheckin.mark.lowAccuracy')}</Badge> : null}
        </span>
        <a
          href={mapUrl(mobile.latitude, mobile.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          // The name says it opens a new tab, one string so every screen reader reads it the same way.
          aria-label={`${t('attendanceDaily.drawer.mobile.map')} ${t('attendanceDaily.drawer.mobile.newTab')}`}
          className="inline-flex min-h-6 w-fit items-center gap-1 text-body-small text-brand-blue underline max-md:min-h-11"
        >
          {t('attendanceDaily.drawer.mobile.map')}
          <ExternalLink aria-hidden="true" className="size-4 stroke-[1.5]" />
        </a>
      </div>
    </div>
  );
}
