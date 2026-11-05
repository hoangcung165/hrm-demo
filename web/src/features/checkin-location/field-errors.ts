// Server validation errors of the Địa điểm chấm công form, mapped to the field and the message that says the cause and the fix.
import { ApiError } from '@/lib/api';
import type { LocationField } from './schemas';

/** A server error shown under a field: an i18n key. */
export type LocationFieldError = { field: LocationField; message: string };

const MESSAGES: Record<LocationField, Partial<Record<string, string>>> = {
  name: { required: 'checkinLocations.validation.nameRequired', too_long: 'checkinLocations.validation.nameTooLong', taken: 'checkinLocations.validation.nameTaken' },
  address: { too_long: 'checkinLocations.validation.addressTooLong' },
  latitude: { required: 'checkinLocations.validation.latitudeRequired', out_of_range: 'checkinLocations.validation.latitudeRange' },
  longitude: { required: 'checkinLocations.validation.longitudeRequired', out_of_range: 'checkinLocations.validation.longitudeRange' },
  radiusMeters: { required: 'checkinLocations.validation.radiusRequired', out_of_range: 'checkinLocations.validation.radiusRange' },
};

const FIELDS: LocationField[] = ['name', 'address', 'latitude', 'longitude', 'radiusMeters'];

/** The field errors a failed save maps to, in form order so the first can take focus; empty when it is not about a field. */
export function locationFieldErrors(error: unknown): LocationFieldError[] {
  if (!(error instanceof ApiError) || error.code !== 'validation.invalid') return [];
  return FIELDS.flatMap((field) => {
    const found = error.fieldErrors.find((candidate) => candidate.field === field);
    return found ? [{ field, message: MESSAGES[field][found.code] ?? 'error.validation.invalid' }] : [];
  });
}
