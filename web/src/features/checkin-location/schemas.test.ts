import { HEAD_OFFICE } from '@/test/checkin-location-handlers';
import { formatCoordinateInput, initialValues, locationChanged, locationSchema, toRequest, type LocationValues } from './schemas';

const values = (over: Partial<LocationValues> = {}): LocationValues => ({ name: 'Kho', address: '', latitude: '21.031', longitude: '105.789', radiusMeters: '100', ...over });
const errorsOf = (over: Partial<LocationValues>) => {
  const result = locationSchema.safeParse(values(over));
  return result.success ? [] : result.error.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);
};

describe('Địa điểm chấm công form', () => {
  it('accepts a dot or a comma as the decimal mark and sends numbers', () => {
    expect(errorsOf({ latitude: '21,0458', longitude: '-105.8' })).toEqual([]);
    expect(toRequest(values({ latitude: '21,0458', longitude: '105.8812' }))).toMatchObject({ latitude: 21.0458, longitude: 105.8812 });
  });

  it('stores a blank address as none and trims the name', () => {
    expect(toRequest(values({ name: '  Kho  ', address: '   ' }))).toMatchObject({ name: 'Kho', address: null });
  });

  it('refuses coordinates out of range or not numbers, field by field', () => {
    expect(errorsOf({ latitude: '90.5', longitude: '181' })).toEqual(['latitude:checkinLocations.validation.latitudeRange', 'longitude:checkinLocations.validation.longitudeRange']);
    expect(errorsOf({ latitude: '', longitude: 'x' })).toEqual(['latitude:checkinLocations.validation.latitudeRequired', 'longitude:checkinLocations.validation.longitudeRange']);
  });

  it('keeps the radius between 50 and 1,000 metres', () => {
    expect(errorsOf({ radiusMeters: '49' })).toEqual(['radiusMeters:checkinLocations.validation.radiusRange']);
    expect(errorsOf({ radiusMeters: '1001' })).toEqual(['radiusMeters:checkinLocations.validation.radiusRange']);
    expect(errorsOf({ radiusMeters: '50' })).toEqual([]);
    expect(errorsOf({ radiusMeters: '1000' })).toEqual([]);
    expect(errorsOf({ radiusMeters: '' })).toEqual(['radiusMeters:checkinLocations.validation.radiusRequired']);
  });

  it('needs a name of at most 100 characters', () => {
    expect(errorsOf({ name: ' ' })).toEqual(['name:checkinLocations.validation.nameRequired']);
    expect(errorsOf({ name: 'x'.repeat(101) })).toEqual(['name:checkinLocations.validation.nameTooLong']);
  });

  it('keeps coordinates to five decimals', () => {
    expect(formatCoordinateInput(21.0458123)).toBe('21.04581');
    expect(formatCoordinateInput(105.5)).toBe('105.5');
  });

  it('tells whether an edit would change anything', () => {
    expect(locationChanged(initialValues(HEAD_OFFICE), HEAD_OFFICE)).toBe(false);
    expect(locationChanged({ ...initialValues(HEAD_OFFICE), radiusMeters: '151' }, HEAD_OFFICE)).toBe(true);
    expect(locationChanged({ ...initialValues(HEAD_OFFICE), address: '' }, HEAD_OFFICE)).toBe(true);
  });
});
