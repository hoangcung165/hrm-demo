// "Dùng vị trí hiện tại" in the form: fills the coordinates from this device, after the tap. It says how it went right
// under the button: where the reading is not available, the coordinates can still be typed.
import { LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDistance } from '@/lib/format';
import { useCurrentPosition } from '../use-current-position';

export function LocationPositionButton() {
  const { t } = useTranslation();
  const { position, read } = useCurrentPosition();
  const reading = position.state === 'reading';
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" size="sm" onClick={() => void read()} disabled={reading} className="max-md:h-11">
        <LocateFixed aria-hidden="true" />
        {t(reading ? 'checkinLocations.form.positionReading' : 'checkinLocations.form.usePosition')}
      </Button>
      <p role="status" className={position.state === 'failed' ? 'text-caption text-danger' : 'text-caption text-ink-muted'}>
        {position.state === 'read' ? t('checkinLocations.form.positionRead', { accuracy: formatDistance(position.accuracyMeters) }) : null}
        {position.state === 'failed' ? t(`checkinLocations.form.position.${position.reason}`) : null}
        {position.state === 'idle' ? t('checkinLocations.form.positionHelper') : null}
      </p>
    </div>
  );
}
