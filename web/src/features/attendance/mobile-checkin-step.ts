// The camera step of a mobile check-in (HRM-39/FE-2): the reading, the camera and the send, put together. The photo and
// the reading of a tap are kept in memory only until they are stored, so a failed send can be tried again with the same
// ones; the server's clock decides the time either way (decision 3 of the design).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useToast } from '@/components/ui/use-toast';
import type { DevicePosition } from '@/lib/device-position';
import { formatCompanyTime, formatDistance } from '@/lib/format';
import { useCheckinCamera } from './mobile-checkin-camera';
import { useCheckinReading, useSendCheckin, type CheckinPunch, type CheckinToday } from './mobile-checkin-api';

/** The photo of one tap, with the reading it was taken at and its preview. */
type Taken = { photo: Blob; position: DevicePosition; url: string };

export function useCheckinStep(today: CheckinToday) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const reading = useCheckinReading();
  const camera = useCheckinCamera();
  const send = useSendCheckin();
  const [taken, setTaken] = useState<Taken | null>(null);
  const [captureFailed, setCaptureFailed] = useState(false);

  const previewUrl = taken?.url;
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const stored = (punch: CheckinPunch) => {
    const place = punch.location ? t('mobileCheckin.camera.toast.at', { place: punch.location.name, distance: formatDistance(punch.distanceMeters ?? 0) }) : '';
    toast({
      variant: 'success',
      message: t(`mobileCheckin.camera.toast.${today.nextLabel}`, { time: formatCompanyTime(punch.at) }),
      detail: punch.outsideLocation ? `${place} · ${t('mobileCheckin.camera.toast.outside')}` : place,
    });
    void navigate('/');
  };

  const submit = (attempt: Taken) => send.mutate({ photo: attempt.photo, position: attempt.position }, { onSuccess: stored });

  /** The shutter: takes the frame and sends it with the reading, in one tap. */
  const shoot = async () => {
    const position = reading.data?.position;
    if (!position) return;
    setCaptureFailed(false);
    try {
      const photo = await camera.capture();
      const attempt = { photo, position, url: URL.createObjectURL(photo) };
      setTaken(attempt);
      submit(attempt);
    } catch {
      setCaptureFailed(true);
    }
  };

  /** Sends the same photo and reading again; nothing was stored by the failed try. */
  const retry = () => {
    if (taken) submit(taken);
  };

  /** Drops the photo and reads the position again: the next photo goes with a fresh reading. */
  const retake = () => {
    setTaken(null);
    setCaptureFailed(false);
    send.reset();
    void reading.refetch();
  };

  const reread = () => void reading.refetch();

  return { today, reading, camera, send, taken, captureFailed, shoot, retry, retake, reread };
}

export type CheckinStep = ReturnType<typeof useCheckinStep>;
