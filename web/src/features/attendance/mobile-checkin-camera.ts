// The front camera of the check-in step (HRM-39/FE-2): opens when the step opens, stops with it (the camera light goes
// off as soon as the Employee leaves), and takes one frame on the shutter. The `<video>` is rendered by the caller.
import { useCallback, useEffect, useRef, useState } from 'react';
import { captureFrame, openFrontCamera, stopStream } from '@/lib/device-camera';
import { DeviceError } from '@/lib/device-position';

/** `denied`: the Employee or the browser refused; `unavailable`: no camera, or another app holds it. */
export type CameraState = 'starting' | 'live' | 'denied' | 'unavailable';

export function useCheckinCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>('starting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    openFrontCamera().then(
      (opened) => {
        // The step was left while the browser asked: the camera is closed again at once.
        if (stopped) {
          stopStream(opened);
          return;
        }
        stream = opened;
        const video = videoRef.current;
        if (video) {
          video.srcObject = opened;
          void video.play().catch(() => {});
        }
        setState('live');
      },
      (error: unknown) => {
        if (!stopped) setState(error instanceof DeviceError && error.reason === 'denied' ? 'denied' : 'unavailable');
      },
    );
    return () => {
      stopped = true;
      if (stream) stopStream(stream);
    };
  }, [attempt]);

  /** Asks the browser for the camera again, after the Employee allowed it in the browser's settings. */
  const restart = useCallback(() => {
    setState('starting');
    setAttempt((count) => count + 1);
  }, []);

  /** The frame on screen as a JPEG. */
  const capture = useCallback((): Promise<Blob> => {
    const video = videoRef.current;
    return video ? captureFrame(video) : Promise.reject(new DeviceError('unavailable'));
  }, []);

  return { videoRef, state, restart, capture };
}
