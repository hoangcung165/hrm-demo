// Chụp ảnh chấm công (HRM-39/FE-2, artboard `#39 Chụp ảnh chấm công (390)`): with the consent in force, the front camera
// opens with the Location chip over it, and one tap on the shutter takes the photo and sends the punch with the reading.
// Location and camera are read only here, after the Employee tapped "Chấm công vào/ra"; nothing is read earlier or later.
import { Camera, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckinCameraView } from '@/components/ui/checkin-camera-view';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { CheckinReadingChip } from '@/features/attendance/components/checkin-reading-chip';
import { CheckinStepAlerts } from '@/features/attendance/components/checkin-step-alerts';
import { useCheckinToday, type CheckinToday } from '@/features/attendance/mobile-checkin-api';
import { useCheckinStep } from '@/features/attendance/mobile-checkin-step';

function CameraStepBody({ today }: { today: CheckinToday }) {
  const { t } = useTranslation();
  const step = useCheckinStep(today);
  const { reading, camera, send, taken } = step;
  // The shutter waits for the camera and a reading; a poor reading or a place outside the zone still allows the punch.
  const ready = camera.state === 'live' && reading.data !== undefined && !reading.isFetching;
  const message = camera.state === 'starting' ? t('mobileCheckin.camera.opening') : camera.state === 'live' ? undefined : t('mobileCheckin.camera.noPicture');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title">{t(`mobileCheckin.camera.title.${today.nextLabel}`)}</h1>
        <p className="text-ink-muted">{t('mobileCheckin.camera.intro')}</p>
      </div>
      <CheckinCameraView
        videoRef={camera.videoRef}
        label={t('mobileCheckin.camera.viewfinder')}
        live={camera.state === 'live'}
        still={taken?.url}
        stillLabel={t('mobileCheckin.camera.photoAlt')}
        chip={<CheckinReadingChip reading={reading} />}
        message={message}
        className="mx-auto max-w-sm"
      />
      <CheckinStepAlerts step={step} />
      {taken && !send.isPending ? null : (
        <Button onClick={() => void step.shoot()} disabled={!ready || send.isPending} aria-busy={send.isPending || undefined} className="h-12 w-full text-body-strong">
          {send.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Camera aria-hidden="true" />}
          {send.isPending ? t('mobileCheckin.camera.sending') : t(`mobileCheckin.camera.shutter.${today.nextLabel}`)}
        </Button>
      )}
      <p className="text-caption text-ink-muted max-md:text-center">{t('mobileCheckin.camera.note')}</p>
    </div>
  );
}

export function CheckinCameraStep() {
  const { t } = useTranslation();
  const today = useCheckinToday();
  if (today.isPending) return <Loading label={t('state.loading')} />;
  if (today.isError) {
    return (
      <Card bare>
        <StateBlock variant="error" title={t('mobileCheckin.loadError')} description={t('state.errorHint')}
          actions={<Button variant="secondary" onClick={() => void today.refetch()}>{t('state.retry')}</Button>} />
      </Card>
    );
  }
  return <CameraStepBody today={today.data} />;
}
