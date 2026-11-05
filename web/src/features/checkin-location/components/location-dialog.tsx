// "Thêm địa điểm chấm công" and "Sửa địa điểm: {tên}": one form dialog. It stays open until the save succeeds.
// Closing it with unsaved input just closes, without a confirm: nothing was saved yet.
import { useId, type RefObject } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { CheckinLocation } from '../api';
import { useLocationForm, type LocationFormOutcome } from '../use-location-form';
import { LocationFormFields } from './location-form-fields';

export type LocationDialogProps = LocationFormOutcome & {
  /** The place being edited, `null` for a new one. */
  place: CheckinLocation | null;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
};

export function LocationDialog({ place, onClose, onSaved, onGone, fallbackFocus }: LocationDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const { form, submit, saving, unchanged } = useLocationForm(place, { onSaved, onGone });
  const addLabel = t('checkinLocations.add');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={place ? t('checkinLocations.form.editTitle', { name: place.name }) : addLabel}
      description={place ? t('checkinLocations.form.editNote') : undefined}
      fallbackFocus={fallbackFocus}
      busy={saving}
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('dialog.cancel')}
          </Button>
          {/* While saving the button keeps its label and is disabled; an edit has nothing to save until a field changes. */}
          <Button type="submit" form={formId} disabled={saving || unchanged}>
            {place ? t('checkinLocations.form.save') : addLabel}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
          <LocationFormFields />
        </form>
      </FormProvider>
    </Dialog>
  );
}
