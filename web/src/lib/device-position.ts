// Reads the phone's position once, for a mobile check-in (HRM-39). Called only after the Employee tapped the button:
// never on page load, never watched in the background (decision 2 of the design). Nothing is kept here.

export type DevicePosition = { latitude: number; longitude: number; accuracyMeters: number };

/** Why a device read failed: refused by the Employee or the browser, not available, or too slow. */
export type DeviceFailure = 'denied' | 'unavailable' | 'timeout';

export class DeviceError extends Error {
  readonly reason: DeviceFailure;

  constructor(reason: DeviceFailure) {
    super(reason);
    this.reason = reason;
  }
}

const POSITION_TIMEOUT_MS = 15_000;

/** One fresh high-accuracy reading (`maximumAge` 0: never a cached one). Rejects with a `DeviceError`. */
export function readPosition(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new DeviceError('unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracyMeters: coords.accuracy }),
      (error) => reject(new DeviceError(error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable')),
      { enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
