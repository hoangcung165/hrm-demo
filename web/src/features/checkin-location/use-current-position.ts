// "Dùng vị trí hiện tại" of the form: reads the position of this computer or phone once, after the tap, and fills the
// coordinates. Never on open, never in the background; nothing is kept besides the two fields.
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DeviceError, readPosition, type DeviceFailure } from '@/lib/device-position';
import { formatCoordinateInput, type LocationValues } from './schemas';

export type CurrentPosition =
  | { state: 'idle' }
  | { state: 'reading' }
  | { state: 'read'; accuracyMeters: number }
  | { state: 'failed'; reason: DeviceFailure };

export function useCurrentPosition() {
  const { setValue } = useFormContext<LocationValues>();
  const [position, setPosition] = useState<CurrentPosition>({ state: 'idle' });

  const read = async () => {
    setPosition({ state: 'reading' });
    try {
      const { latitude, longitude, accuracyMeters } = await readPosition();
      // The fields count as touched: a filled value is validated like a typed one.
      const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
      setValue('latitude', formatCoordinateInput(latitude), options);
      setValue('longitude', formatCoordinateInput(longitude), options);
      setPosition({ state: 'read', accuracyMeters });
    } catch (error) {
      setPosition({ state: 'failed', reason: error instanceof DeviceError ? error.reason : 'unavailable' });
    }
  };

  return { position, read };
}
