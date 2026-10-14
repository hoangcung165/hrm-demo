// The three fields of the thresholds dialog, inside a FormProvider.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { MAX_ENDING_WEEKS, type SettingsFormValues } from '../settings-schemas';

export type SettingsFieldsProps = {
  /** The text in the near-full field, for the message of a bench threshold that is not below it. */
  nearFull: string;
};

export function SettingsFields({ nearFull }: SettingsFieldsProps) {
  const { t } = useTranslation();
  const percent = <span className="text-ink-muted">%</span>;
  return (
    <FormGrid>
      <FormField<SettingsFormValues>
        name="benchPercent"
        label={t('resources.settings.bench')}
        helper={t('resources.settings.benchHelper')}
        errorValues={{ nearFull }}
        required
        inputMode="numeric"
        autoComplete="off"
        trailing={percent}
      />
      <FormField<SettingsFormValues>
        name="nearFullPercent"
        label={t('resources.settings.nearFull')}
        helper={t('resources.settings.nearFullHelper')}
        required
        inputMode="numeric"
        autoComplete="off"
        trailing={percent}
      />
      <FormField<SettingsFormValues>
        name="endingWeeks"
        label={t('resources.settings.endingWeeks')}
        helper={t('resources.settings.endingWeeksHelper', { max: MAX_ENDING_WEEKS })}
        required
        inputMode="numeric"
        autoComplete="off"
        trailing={<span className="text-ink-muted">{t('resources.settings.weeksUnit')}</span>}
        className="md:col-span-2 md:max-w-[calc(50%-0.5rem)]"
      />
    </FormGrid>
  );
}
