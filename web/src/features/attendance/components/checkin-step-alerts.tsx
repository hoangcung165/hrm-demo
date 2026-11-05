// What the camera step tells the Employee when something is wrong or worth knowing, one Alert each (artboard `#39
// Chấm công bằng điện thoại (trạng thái)`): a refused or missing location or camera, a send that failed (nothing was
// stored), a poor reading and a place outside the zone (both still allowed). Each says the cause and what to do.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { DeviceError } from '@/lib/device-position';
import { formatDistance } from '@/lib/format';
import type { CheckinStep } from '../mobile-checkin-step';

export type CheckinStepAlertsProps = { step: CheckinStep };

/** The photo was refused for what it is (too large, wrong type): the same photo would be refused again. */
const photoRejected = (error: unknown) => error instanceof ApiError && error.fieldErrors.some((each) => each.field === 'photo');

/** `focus`: the button that follows a failed send takes the focus, which the removed shutter leaves behind. */
function Action({ label, onClick, focus = false }: { label: string; onClick: () => void; focus?: boolean }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} autoFocus={focus} className="mt-2 max-md:h-11">
      {label}
    </Button>
  );
}

export function CheckinStepAlerts({ step }: CheckinStepAlertsProps) {
  const { t } = useTranslation();
  const { reading, camera, send, taken, captureFailed } = step;
  const located = reading.data?.located;

  const locationKey = reading.error instanceof DeviceError ? (reading.error.reason === 'denied' ? 'locationDenied' : 'locationUnavailable') : reading.isError ? 'locateFailed' : null;
  const cameraKey = camera.state === 'denied' ? 'cameraDenied' : camera.state === 'unavailable' || captureFailed ? 'cameraUnavailable' : null;

  return (
    <>
      {send.isError ? (
        photoRejected(send.error) ? (
          <Alert variant="danger" title={t('mobileCheckin.camera.error.photoRejected.title')}>
            {t('mobileCheckin.camera.error.photoRejected.text')}
            <Action label={t('mobileCheckin.camera.error.retake')} onClick={step.retake} focus />
          </Alert>
        ) : (
          <Alert variant="danger" title={t('mobileCheckin.camera.error.sendFailed.title')}>
            {t('mobileCheckin.camera.error.sendFailed.text')}
            <div className="flex gap-2">
              <Action label={t('state.retry')} onClick={step.retry} focus />
              <Action label={t('mobileCheckin.camera.error.retake')} onClick={step.retake} />
            </div>
          </Alert>
        )
      ) : null}
      {cameraKey ? (
        <Alert variant="danger" title={t(`mobileCheckin.camera.error.${cameraKey}.title`)}>
          {t(`mobileCheckin.camera.error.${cameraKey}.text`)}
          <Action label={t('state.retry')} onClick={captureFailed ? step.retake : camera.restart} />
        </Alert>
      ) : null}
      {locationKey ? (
        <Alert variant="danger" title={t(`mobileCheckin.camera.error.${locationKey}.title`)}>
          {t(`mobileCheckin.camera.error.${locationKey}.text`)}
          <Action label={t('state.retry')} onClick={step.reread} />
        </Alert>
      ) : null}
      {located && !reading.isFetching && !taken ? (
        <>
          {located.lowAccuracy ? (
            <Alert variant="warning" title={t('mobileCheckin.camera.warning.lowAccuracy.title', { accuracy: formatDistance(located.accuracyMeters), max: formatDistance(located.maxAccuracyMeters) })}>
              {t('mobileCheckin.camera.warning.lowAccuracy.text')}
              <Action label={t('mobileCheckin.camera.warning.lowAccuracy.reread')} onClick={step.reread} />
            </Alert>
          ) : null}
          {located.outsideLocation ? (
            <Alert variant="warning" title={t('mobileCheckin.camera.warning.outside.title')}>
              {t('mobileCheckin.camera.warning.outside.text')}
            </Alert>
          ) : null}
        </>
      ) : null}
    </>
  );
}
