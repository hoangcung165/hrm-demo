// What a phone gives the check-in step, for tests: jsdom has neither a position nor a camera. `stubDevices` puts a
// fake geolocation and a fake front camera on `navigator`; `restoreDevices` takes them off again.
import { vi } from 'vitest';

export type PositionAnswer = 'ok' | 'denied' | 'unavailable' | 'timeout';
export type CameraAnswer = 'ok' | 'denied' | 'busy';

export type DeviceOptions = {
  /** What the next reading answers; a function is asked at every reading, to change the answer between them. */
  position?: PositionAnswer | (() => PositionAnswer);
  camera?: CameraAnswer | (() => CameraAnswer);
  coords?: { latitude: number; longitude: number; accuracy: number };
};

const COORDS = { latitude: 21.031, longitude: 105.789, accuracy: 12 };
const ask = <T>(answer: T | (() => T)): T => (typeof answer === 'function' ? (answer as () => T)() : answer);

export function stubDevices({ position = 'ok', camera = 'ok', coords = COORDS }: DeviceOptions = {}) {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const getCurrentPosition = vi.fn((success: PositionCallback, failure?: PositionErrorCallback) => {
    const answer = ask(position);
    if (answer === 'ok') {
      success({ coords: { ...coords, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition);
      return;
    }
    const code = answer === 'denied' ? 1 : answer === 'timeout' ? 3 : 2;
    failure?.({ code, message: answer, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  });
  const getUserMedia = vi.fn(async (): Promise<MediaStream> => {
    const answer = ask(camera);
    if (answer === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
    if (answer === 'busy') throw new DOMException('Could not start video source', 'NotReadableError');
    return stream;
  });
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  // jsdom prints "not implemented" for play() and returns nothing; a browser returns a promise.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  return { getCurrentPosition, getUserMedia, track };
}

export function restoreDevices() {
  Reflect.deleteProperty(navigator, 'geolocation');
  Reflect.deleteProperty(navigator, 'mediaDevices');
  vi.restoreAllMocks();
}

/** jsdom has no object URLs: each one is a distinct fake, and the ones released are listed. */
export function stubObjectUrls() {
  let next = 0;
  const revoked: string[] = [];
  const create = vi.fn(() => `blob:fake-${(next += 1)}`);
  URL.createObjectURL = create as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = ((url: string) => void revoked.push(url)) as typeof URL.revokeObjectURL;
  return { create, revoked };
}
