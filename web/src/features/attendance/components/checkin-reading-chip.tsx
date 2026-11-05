// The Location chip of the camera step: the reading in words (reading, inside or outside the zone, how far, how exact,
// or no reading at all). Never blocks the punch; the Alerts under the picture say what to do.
import { useTranslation } from 'react-i18next';
import { CheckinLocationChip } from '@/components/ui/checkin-location-chip';
import { formatDistance } from '@/lib/format';
import type { CheckinStep } from '../mobile-checkin-step';

export type CheckinReadingChipProps = { reading: CheckinStep['reading'] };

export function CheckinReadingChip({ reading }: CheckinReadingChipProps) {
  const { t } = useTranslation();
  if (reading.isFetching) return <CheckinLocationChip tone="neutral" busy title={t('mobileCheckin.camera.chip.reading')} />;
  if (!reading.data) return <CheckinLocationChip tone="neutral" unavailable title={t('mobileCheckin.camera.chip.none')} />;
  const { location, distanceMeters, outsideLocation, accuracyMeters } = reading.data.located;
  const accuracy = formatDistance(accuracyMeters);
  const place = location?.name ?? '';
  const title = !outsideLocation ? t('mobileCheckin.camera.chip.inside', { place }) : place ? t('mobileCheckin.camera.chip.outside', { place }) : t('mobileCheckin.mark.outside');
  const detail = distanceMeters === null ? t('mobileCheckin.camera.chip.accuracy', { accuracy }) : t('mobileCheckin.camera.chip.distance', { distance: formatDistance(distanceMeters), accuracy });
  return <CheckinLocationChip tone={outsideLocation || reading.data.located.lowAccuracy ? 'warning' : 'success'} title={title} detail={detail} />;
}
