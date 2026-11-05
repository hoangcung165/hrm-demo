// Fields of the add/edit Địa điểm chấm công form, inside a FormProvider: name and address, the coordinates (typed or read
// from this device) and the radius.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { ADDRESS_MAX, NAME_MAX, RADIUS_MAX, RADIUS_MIN, type LocationValues } from '../schemas';
import { LocationPositionButton } from './location-position-button';

export function LocationFormFields() {
  const { t } = useTranslation();
  return (
    <>
      <FormField<LocationValues> name="name" label={t('checkinLocations.form.name')} required maxLength={NAME_MAX} autoComplete="off" />
      <FormField<LocationValues> name="address" label={t('checkinLocations.form.address')} maxLength={ADDRESS_MAX} autoComplete="off" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField<LocationValues>
          name="latitude"
          label={t('checkinLocations.form.latitude')}
          helper={t('checkinLocations.form.latitudeHelper')}
          required
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:tabular-nums"
        />
        <FormField<LocationValues>
          name="longitude"
          label={t('checkinLocations.form.longitude')}
          helper={t('checkinLocations.form.longitudeHelper')}
          required
          inputMode="decimal"
          autoComplete="off"
          className="[&_input]:tabular-nums"
        />
      </div>
      <LocationPositionButton />
      <FormField<LocationValues>
        name="radiusMeters"
        label={t('checkinLocations.form.radius')}
        helper={t('checkinLocations.form.radiusHelper', { min: RADIUS_MIN, max: RADIUS_MAX })}
        required
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        className="md:w-48 [&_input]:text-right [&_input]:tabular-nums"
      />
    </>
  );
}
