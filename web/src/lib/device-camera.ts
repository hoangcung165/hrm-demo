// The phone's front camera for a mobile check-in (HRM-39): a live stream and one still frame. Front camera only, no
// gallery (decision 4 of the design). The stream is stopped by the caller as soon as the step ends.
import { DeviceError } from './device-position';

/** The longest side of the photo that is sent; a phone's full frame is far more than a check-in needs. */
const MAX_SIDE_PX = 1280;
const JPEG_QUALITY = 0.85;

/** Opens the front camera, no audio. A refusal rejects with `denied`, a missing or busy camera with `unavailable`. */
export async function openFrontCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new DeviceError('unavailable');
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    throw new DeviceError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
  }
}

export function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

/** The frame on screen as a JPEG, not mirrored (the preview is mirrored, the photo is what the camera saw). */
export function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const { videoWidth, videoHeight } = video;
  if (videoWidth === 0 || videoHeight === 0) return Promise.reject(new DeviceError('unavailable'));
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(videoWidth, videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new DeviceError('unavailable'));
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new DeviceError('unavailable'))), 'image/jpeg', JPEG_QUALITY);
  });
}
