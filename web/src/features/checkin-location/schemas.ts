// The add/edit form of a Địa điểm chấm công, validated by the same rules as the backend (`AttendanceLocationService`).
// Messages are i18n keys, so the schema stays free of UI text.
import { z } from 'zod';
import type { CheckinLocation, CheckinLocationRequest } from './api';

export const NAME_MAX = 100;
export const ADDRESS_MAX = 255;
export const RADIUS_MIN = 50;
export const RADIUS_MAX = 1000;

/** Everything is what is typed, so a half-typed number is not lost. */
export type LocationValues = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

export type LocationField = keyof LocationValues;

export const DEFAULT_RADIUS = 100;

/** Coordinates are kept to 5 decimals (about a metre), written with a dot. */
export const formatCoordinateInput = (value: number): string => String(Number(value.toFixed(5)));

export function initialValues(place: CheckinLocation | null): LocationValues {
  if (!place) return { name: '', address: '', latitude: '', longitude: '', radiusMeters: String(DEFAULT_RADIUS) };
  return {
    name: place.name,
    address: place.address ?? '',
    latitude: formatCoordinateInput(place.latitude),
    longitude: formatCoordinateInput(place.longitude),
    radiusMeters: String(place.radiusMeters),
  };
}

/** "21,031" and "21.031" both mean 21.031. */
const toNumber = (value: string): number => Number(value.trim().replace(',', '.'));
const NUMBER_PATTERN = /^-?\d{1,3}([.,]\d+)?$/;

const text = z.string().trim();

export const locationSchema = z
  .object({ name: text.min(1, 'checkinLocations.validation.nameRequired').max(NAME_MAX, 'checkinLocations.validation.nameTooLong'), address: text.max(ADDRESS_MAX, 'checkinLocations.validation.addressTooLong'), latitude: text, longitude: text, radiusMeters: text })
  .superRefine((values, ctx) => {
    const fail = (field: LocationField, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });
    const coordinate = (field: 'latitude' | 'longitude', limit: number) => {
      const value = values[field];
      if (!value) fail(field, `checkinLocations.validation.${field}Required`);
      else if (!NUMBER_PATTERN.test(value) || Math.abs(toNumber(value)) > limit) fail(field, `checkinLocations.validation.${field}Range`);
    };
    coordinate('latitude', 90);
    coordinate('longitude', 180);
    const radius = values.radiusMeters;
    if (!radius) fail('radiusMeters', 'checkinLocations.validation.radiusRequired');
    else if (!/^\d{1,4}$/.test(radius) || Number(radius) < RADIUS_MIN || Number(radius) > RADIUS_MAX) fail('radiusMeters', 'checkinLocations.validation.radiusRange');
  });

/** What the API gets. Takes values zod has already trimmed. */
export function toRequest(values: LocationValues): CheckinLocationRequest {
  return {
    name: values.name.trim(),
    address: values.address.trim() || null,
    latitude: toNumber(values.latitude),
    longitude: toNumber(values.longitude),
    radiusMeters: Number(values.radiusMeters),
  };
}

/** Edit: whether the form would send anything other than the place has. */
export function locationChanged(values: LocationValues, place: CheckinLocation): boolean {
  const now = toRequest(values);
  const before = toRequest(initialValues(place));
  return (Object.keys(now) as Array<keyof CheckinLocationRequest>).some((key) => now[key] !== before[key]);
}
